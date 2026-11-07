'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress, ProgressValue } from '@/components/ui/progress'
import {
  getUploadErrorKey,
  uploadCourseFile,
} from '@/lib/storage/upload-client'

interface DocumentUploadProps {
  courseId: string
  currentUrl?: string | null
  onUploaded: (url: string) => void
  onRemoved?: () => void
  acceptPdfOnly?: boolean
  /** Report BS-30: the lesson slide-deck slot. */
  acceptSlides?: boolean
}

function getFileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const segment = pathname.split('/').pop()
    return segment ? decodeURIComponent(segment) : url
  } catch {
    const segment = url.split('/').pop()
    return segment ? decodeURIComponent(segment) : url
  }
}

export default function DocumentUpload({
  courseId,
  currentUrl,
  onUploaded,
  onRemoved,
  acceptPdfOnly = true,
  acceptSlides = false,
}: DocumentUploadProps) {
  const t = useTranslations('instructor')
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [, setDone] = useState(Boolean(currentUrl))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const hasFile = Boolean(currentUrl)

  useEffect(() => {
    setDone(Boolean(currentUrl))
    setUploading(false)
    setProgress(0)
    setErrorMessage(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [currentUrl])

  const handleFile = async (file: File) => {
    setUploading(true)
    setProgress(0)
    setDone(false)
    setErrorMessage(null)

    const result = await uploadCourseFile({
      bucket: 'course-documents',
      courseId,
      file,
      onProgress: setProgress,
    })

    setUploading(false)

    if (result.error || !result.url) {
      setProgress(0)
      setDone(Boolean(currentUrl))
      const errorKey = getUploadErrorKey(result.error)
      const message = t.has(errorKey) ? t(errorKey) : t('upload_error')
      setErrorMessage(message)
      toast.error(message)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setDone(true)
    onUploaded(result.url)
    toast.success(hasFile ? t('document_replaced') : t('file_uploaded'))
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRemove = () => {
    if (!onRemoved) return
    if (!window.confirm(t('confirm_remove_document'))) return

    setDone(false)
    setErrorMessage(null)
    if (inputRef.current) inputRef.current.value = ''
    onRemoved()
    toast.success(t('document_removed'))
  }

  const accept = acceptSlides
    ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf,.pptx,.ppt,.pdf'
    : acceptPdfOnly
      ? 'application/pdf,.pdf'
      : 'application/pdf,application/zip,application/msword,.pdf,.zip,.doc,.docx'

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />

      {hasFile && !uploading ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">{t('document_attached')}</p>
              <p className="truncate text-xs text-muted-foreground">
                {getFileNameFromUrl(currentUrl!)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('change_document')}
            </Button>
            {onRemoved && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={handleRemove}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('remove_document')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {uploading ? t('uploading') : t('upload_document')}
        </Button>
      )}

      {uploading && (
        <div className="space-y-1">
          <Progress value={progress}>
            <ProgressValue />
          </Progress>
          <p className="text-xs text-muted-foreground text-end">
            {hasFile ? t('replacing_document') : t('uploading')} · {progress}%
          </p>
        </div>
      )}

      {errorMessage && !uploading && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </p>
      )}
    </div>
  )
}
