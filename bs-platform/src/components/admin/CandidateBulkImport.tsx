'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, CheckCircle2, CopyCheck, FolderUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress, ProgressValue } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Outcome = 'imported' | 'updated' | 'duplicate' | 'failed'

interface ImportResult {
  fileName: string
  outcome: Outcome
  reason?: string
  name?: string
}

/** Matches MAX_FILES_PER_REQUEST on the server. */
const BATCH_SIZE = 5

/** Reasons we have a translation for; anything else (an AI-service message) is shown raw. */
const KNOWN_REASONS = new Set([
  'unsupported_type',
  'empty_file',
  'file_too_large',
  'no_identity_found',
  'save_failed',
  'same_file',
  'same_email',
  'network_error',
  'request_failed',
  'unexpected_error',
])

/** Report BS-40: pick a folder, import every CV in it, report each file. */
export default function CandidateBulkImport({ candidateCount }: { candidateCount: number }) {
  const t = useTranslations('candidates_import')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [results, setResults] = useState<ImportResult[]>([])

  const onPick = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList).filter((f) => f.size > 0)
    if (files.length === 0) return

    setRunning(true)
    setResults([])
    setDone(0)
    setTotal(files.length)

    const collected: ImportResult[] = []
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE)
      const body = new FormData()
      batch.forEach((file) => body.append('files', file))

      try {
        const res = await fetch('/api/admin/candidates/import', { method: 'POST', body })
        const data = (await res.json()) as { results?: ImportResult[]; error?: string }
        if (data.results) {
          collected.push(...data.results)
        } else {
          batch.forEach((file) =>
            collected.push({
              fileName: file.name,
              outcome: 'failed',
              reason: data.error ?? 'request_failed',
            })
          )
        }
      } catch {
        batch.forEach((file) =>
          collected.push({ fileName: file.name, outcome: 'failed', reason: 'network_error' })
        )
      }

      setDone(Math.min(files.length, i + batch.length))
      setResults([...collected])
    }

    setRunning(false)
    if (inputRef.current) inputRef.current.value = ''
    router.refresh()
  }

  const counts = results.reduce<Record<Outcome, number>>(
    (acc, r) => ({ ...acc, [r.outcome]: (acc[r.outcome] ?? 0) + 1 }),
    { imported: 0, updated: 0, duplicate: 0, failed: 0 }
  )

  const icon = (outcome: Outcome) => {
    if (outcome === 'failed') return <AlertCircle className="h-4 w-4 text-destructive" />
    if (outcome === 'duplicate') return <CopyCheck className="h-4 w-4 text-amber-500" />
    return <CheckCircle2 className="h-4 w-4 text-green-600" />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('hint')}</p>
          <p className="num-en text-sm">{t('in_database', { count: candidateCount })}</p>

          <input
            ref={inputRef}
            type="file"
            multiple
            // Folder picking: non-standard but supported by Chrome/Edge/Safari.
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => void onPick(e.target.files)}
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={running} onClick={() => inputRef.current?.click()}>
              {running ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <FolderUp className="me-2 h-4 w-4" />
              )}
              {t('choose_folder')}
            </Button>
          </div>

          {total > 0 && (
            <div className="space-y-1">
              <Progress value={(done / total) * 100}>
                <ProgressValue />
              </Progress>
              <p className="num-en text-xs text-muted-foreground">
                {done} / {total}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('report_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="num-en flex flex-wrap gap-3 text-sm">
              <span className="text-green-600">
                {t('outcome_imported')}: {counts.imported}
              </span>
              <span className="text-green-600">
                {t('outcome_updated')}: {counts.updated}
              </span>
              <span className="text-amber-600">
                {t('outcome_duplicate')}: {counts.duplicate}
              </span>
              <span className="text-destructive">
                {t('outcome_failed')}: {counts.failed}
              </span>
            </div>

            <div className="max-h-96 space-y-1 overflow-y-auto">
              {results.map((r, i) => (
                <div
                  key={`${r.fileName}-${i}`}
                  className={cn(
                    'flex items-center gap-2 rounded border p-2 text-sm',
                    r.outcome === 'failed' && 'border-destructive/30'
                  )}
                >
                  {icon(r.outcome)}
                  <span className="min-w-0 flex-1 truncate">{r.fileName}</span>
                  {r.name && (
                    <span className="hidden truncate text-xs text-muted-foreground sm:block">
                      {r.name}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t(`outcome_${r.outcome}`)}
                    {r.reason
                      ? ` · ${KNOWN_REASONS.has(r.reason) ? t(`reason_${r.reason}`) : r.reason}`
                      : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
