'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, Loader2, Minus, Sparkles, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MAX_CV_BYTES } from '@/lib/profile/profile-constants'
import type { CvExtractedProfile } from '@/types/profile'
import { cn } from '@/lib/utils'

type ModalState = 'upload' | 'processing' | 'preview' | 'error'

interface ImportCvModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (data: CvExtractedProfile) => void
}

const PROCESSING_MESSAGES = [
  'import_msg_1',
  'import_msg_2',
  'import_msg_3',
  'import_msg_4',
] as const

export default function ImportCvModal({ open, onOpenChange, onApply }: ImportCvModalProps) {
  const t = useTranslations('profile')
  const [state, setState] = useState<ModalState>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [extracted, setExtracted] = useState<CvExtractedProfile | null>(null)
  const [msgIndex, setMsgIndex] = useState(0)

  const reset = useCallback(() => {
    setState('upload')
    setFile(null)
    setExtracted(null)
    setMsgIndex(0)
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    if (state !== 'processing') return
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % PROCESSING_MESSAGES.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [state])

  const handleExtract = async () => {
    if (!file) return
    setState('processing')
    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/profile/import-cv', { method: 'POST', body: form })
      const data = (await res.json()) as { profile?: CvExtractedProfile; error?: string }
      if (!res.ok) {
        setState('error')
        return
      }
      setExtracted(data.profile ?? null)
      setState('preview')
    } catch {
      setState('error')
    }
  }

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') return
    if (f.size > MAX_CV_BYTES) return
    setFile(f)
  }

  const sections = extracted
    ? [
        { key: 'personal', label: t('basic_info'), hasData: Boolean(extracted.full_name || extracted.headline || extracted.phone) },
        { key: 'skills', label: t('skills'), hasData: (extracted.skills?.length ?? 0) > 0 },
        { key: 'experience', label: t('experience'), hasData: (extracted.experience?.length ?? 0) > 0 },
        { key: 'education', label: t('education'), hasData: (extracted.education?.length ?? 0) > 0 },
        { key: 'projects', label: t('projects'), hasData: (extracted.projects?.length ?? 0) > 0 },
        { key: 'links', label: t('links'), hasData: Boolean(extracted.links && Object.values(extracted.links).some(Boolean)) },
      ]
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {state === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('import_title')}</DialogTitle>
              <p className="text-sm text-muted-foreground">{t('import_description')}</p>
            </DialogHeader>
            <div
              className={cn(
                'rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-border'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) handleFile(f)
              }}
            >
              <Upload className="h-10 w-10 mx-auto text-primary mb-3" />
              <p className="text-sm mb-2">{t('import_drop')}</p>
              <label className="cursor-pointer text-sm text-primary hover:underline">
                {t('import_browse')}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </label>
              {file && (
                <p className="text-xs text-muted-foreground mt-3 num-en">
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" disabled={!file} onClick={() => void handleExtract()}>
                <Sparkles className="h-4 w-4 me-2" />
                {t('import_extract')}
              </Button>
            </DialogFooter>
          </>
        )}

        {state === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">{t(PROCESSING_MESSAGES[msgIndex])}</p>
          </div>
        )}

        {state === 'preview' && extracted && (
          <>
            <DialogHeader>
              <DialogTitle>{t('import_preview')}</DialogTitle>
              <p className="text-sm text-muted-foreground">{t('import_preview_hint')}</p>
            </DialogHeader>
            <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3">{t('merge_note')}</p>
            <div className="space-y-3">
              {sections.map((section) => (
                <div key={section.key} className="flex items-center justify-between text-sm border-b pb-2">
                  <span>{section.label}</span>
                  {section.hasData ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            {extracted.skills && extracted.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {extracted.skills.slice(0, 12).map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onApply(extracted)
                  onOpenChange(false)
                }}
              >
                {t('import_apply')}
              </Button>
            </DialogFooter>
          </>
        )}

        {state === 'error' && (
          <div className="py-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-sm">{t('import_error')}</p>
            <DialogFooter className="justify-center gap-2">
              <Button type="button" variant="outline" onClick={reset}>
                {t('try_again')}
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                {t('fill_manually')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
