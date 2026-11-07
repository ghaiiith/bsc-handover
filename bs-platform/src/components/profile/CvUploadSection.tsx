'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MAX_CV_BYTES } from '@/lib/profile/profile-constants'

interface CvUploadSectionProps {
  initialUrl?: string | null
  initialName?: string | null
}

export default function CvUploadSection({ initialUrl, initialName }: CvUploadSectionProps) {
  const t = useTranslations('cv_upload')
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initialUrl ?? null)
  const [name, setName] = useState(initialName ?? null)
  const [busy, setBusy] = useState(false)

  const onPick = () => fileRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error(t('pdf_only'))
      return
    }
    if (file.size > MAX_CV_BYTES) {
      toast.error(t('too_large'))
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/cv/upload-file', { method: 'POST', body: fd })
      const data = (await res.json()) as { url?: string; name?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(t('upload_error'))
        return
      }
      setUrl(data.url)
      setName(data.name ?? file.name)
      toast.success(t('uploaded'))
    } catch {
      toast.error(t('upload_error'))
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/cv/upload-file', { method: 'DELETE' })
      if (!res.ok) {
        toast.error(t('upload_error'))
        return
      }
      setUrl(null)
      setName(null)
      toast.success(t('removed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={onFile}
        />
        {url ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-2 text-sm font-medium hover:underline"
            >
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="truncate">{name ?? t('your_cv')}</span>
            </a>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={onPick} disabled={busy}>
                {t('replace')}
              </Button>
              <Button variant="ghost" size="sm" onClick={onRemove} disabled={busy}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={onPick} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {t('upload_btn')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
