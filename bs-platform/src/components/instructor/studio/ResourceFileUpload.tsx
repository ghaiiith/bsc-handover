'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress, ProgressValue } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getUploadErrorKey,
  uploadCourseResourceFile,
} from '@/lib/storage/upload-client'
import { isSupabaseStorageUrl } from '@/lib/storage/supabase-url'
import type { ResourceUrlAccessMode } from '@/types'

interface ResourceFileUploadProps {
  courseId: string
  fileUrl: string
  urlAccessMode: ResourceUrlAccessMode
  disabled?: boolean
  onFileUrlChange: (url: string) => void
  onUrlAccessModeChange: (mode: ResourceUrlAccessMode) => void
  onFileUploaded: (url: string, fileSizeBytes: number) => void
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

const RESOURCE_ACCEPT =
  '.pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.png,.jpg,.jpeg,.webp,.svg'

export default function ResourceFileUpload({
  courseId,
  fileUrl,
  urlAccessMode,
  disabled = false,
  onFileUrlChange,
  onUrlAccessModeChange,
  onFileUploaded,
}: ResourceFileUploadProps) {
  const t = useTranslations('studio.resources')
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const hasFileUrl = Boolean(fileUrl.trim())
  const isHostedUpload = hasFileUrl && isSupabaseStorageUrl(fileUrl)
  const showExternalUrlField = !isHostedUpload
  const showUrlAccessMode = showExternalUrlField && hasFileUrl

  useEffect(() => {
    setUploading(false)
    setProgress(0)
    setErrorMessage(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [disabled])

  useEffect(() => {
    if (!fileUrl.trim()) {
      setUploadedFileName(null)
    }
  }, [fileUrl])

  const handleFile = async (file: File) => {
    setUploading(true)
    setProgress(0)
    setErrorMessage(null)

    const result = await uploadCourseResourceFile({
      courseId,
      file,
      onProgress: setProgress,
    })

    setUploading(false)

    if (result.error || !result.url) {
      setProgress(0)
      const errorKey = getUploadErrorKey(result.error)
      const message = t.has(errorKey) ? t(errorKey) : t('upload_error')
      setErrorMessage(message)
      toast.error(message)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    onFileUploaded(result.url, result.fileSizeBytes)
    setUploadedFileName(file.name)
    toast.success(t('file_uploaded'))
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={RESOURCE_ACCEPT}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />

      {isHostedUpload && !uploading ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">{t('file_attached')}</p>
              <p className="truncate text-xs text-muted-foreground">
                {uploadedFileName ?? getFileNameFromUrl(fileUrl)}
              </p>
            </div>
          </div>
          {!disabled && (
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
                {t('change_file')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => onFileUrlChange('')}
                className="gap-1.5 text-muted-foreground"
              >
                <Link2 className="h-3.5 w-3.5" />
                {t('use_external_link')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        !disabled && (
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
              <Upload className="h-4 w-4" />
            )}
            {uploading ? t('uploading') : t('upload_file')}
          </Button>
        )
      )}

      {uploading && (
        <div className="space-y-1">
          <Progress value={progress}>
            <ProgressValue />
          </Progress>
          <p className="text-end text-xs text-muted-foreground">
            {t('uploading')} · {progress}%
          </p>
        </div>
      )}

      {errorMessage && !uploading && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </p>
      )}

      {showExternalUrlField && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('or_paste_url')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-file-url" className="sr-only">
              {t('file_url')}
            </Label>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                id="resource-file-url"
                value={fileUrl}
                onChange={(e) => onFileUrlChange(e.target.value)}
                placeholder="https://"
                disabled={disabled || uploading}
                readOnly={disabled}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('upload_hint')}</p>
          </div>

          {showUrlAccessMode && (
            <div className="space-y-2">
              <Label htmlFor="resource-url-access-mode">{t('url_access_mode')}</Label>
              <Select
                value={urlAccessMode}
                onValueChange={(value) => onUrlAccessModeChange(value as ResourceUrlAccessMode)}
                disabled={disabled || uploading}
              >
                <SelectTrigger id="resource-url-access-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visit">{t('url_access_visit')}</SelectItem>
                  <SelectItem value="download">{t('url_access_download')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('url_access_hint')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
