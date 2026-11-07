'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress, ProgressValue } from '@/components/ui/progress'
import {
  getUploadErrorKey,
  uploadCourseFile,
  validateUploadFile,
  type UploadBucket,
} from '@/lib/storage/upload-client'
import { uploadCourseVideoToR2 } from '@/lib/storage/r2-video-upload'
import { uploadCourseVideoToVimeo } from '@/lib/storage/vimeo-video-upload'
import {
  startVideoProcessing,
  pollVideoJob,
} from '@/lib/storage/video-processing-client'

interface VideoUploadProps {
  courseId: string
  bucket?: UploadBucket
  /** For video uploads: which storage slot the file belongs to. */
  videoSlot?: 'lesson' | 'preview'
  /** Required when videoSlot is 'lesson'. */
  lessonId?: string | null
  /** Current stored value (asset id for videos, URL for images). */
  currentUrl?: string | null
  onUploaded: (value: string, durationMinutes?: number) => void
  onRemoved?: () => void
  /** Optional upload provider override for new uploads. */
  uploadProvider?: 'vimeo' | 'r2' | 'default' | null
  /** Transcode the uploaded video online into an adaptive HLS ladder (R2 lessons). */
  enableProcessing?: boolean
  label?: string
}

export default function VideoUpload({
  courseId,
  bucket = 'course-videos',
  videoSlot = 'lesson',
  lessonId,
  currentUrl,
  onUploaded,
  onRemoved,
  label,
  uploadProvider = 'default',
  enableProcessing = true,
}: VideoUploadProps) {
  const t = useTranslations('instructor')
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [, setDone] = useState(Boolean(currentUrl))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processingPct, setProcessingPct] = useState(0)
  const [processingStage, setProcessingStage] = useState<string | null>(null)

  const stageLabel = (stage: string | null): string => {
    const key = `processing_stage_${stage ?? 'transcoding'}`
    return t.has(key) ? t(key) : t('processing_video')
  }

  const runProcessing = async (assetId: string) => {
    if (!lessonId) return
    setProcessing(true)
    setProcessingPct(0)
    setProcessingStage('analyzing')

    const started = await startVideoProcessing(courseId, lessonId, assetId)
    if (started.error || !started.jobId) {
      // Non-fatal: the raw upload is already attached and playable.
      setProcessing(false)
      toast.warning(t('processing_skipped'))
      return
    }

    const final = await pollVideoJob(started.jobId, (p) => {
      setProcessingPct(p.progress)
      setProcessingStage(p.stage)
    })

    setProcessing(false)
    if (final.status === 'completed') {
      toast.success(t('processing_done'))
    } else {
      toast.warning(t('processing_failed'))
    }
  }

  const isVideo = bucket === 'course-videos'
  const hasVideo = Boolean(currentUrl)

  useEffect(() => {
    setDone(Boolean(currentUrl))
    setUploading(false)
    setProgress(0)
    setErrorMessage(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [currentUrl])

  const fail = (error?: string) => {
    setProgress(0)
    setDone(Boolean(currentUrl))
    const errorKey = getUploadErrorKey(error)
    const message = t.has(errorKey) ? t(errorKey) : t('upload_error')
    setErrorMessage(message)
    toast.error(message)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    const validationError = validateUploadFile(bucket, file)
    if (validationError) {
      fail(validationError)
      return
    }

    setUploading(true)
    setProgress(0)
    setDone(false)
    setErrorMessage(null)

    if (isVideo) {
      const tryVimeo = uploadProvider === 'vimeo' || uploadProvider === 'default'
      const tryR2 = uploadProvider === 'r2' || uploadProvider === 'default'

      if (tryVimeo) {
        const vimeoResult = await uploadCourseVideoToVimeo({
          courseId,
          slot: videoSlot,
          lessonId,
          file,
          onProgress: setProgress,
        })

        if (vimeoResult.assetId && !vimeoResult.error) {
          setUploading(false)
          setDone(true)
          onUploaded(vimeoResult.assetId, vimeoResult.durationMinutes)
          toast.success(hasVideo ? t('video_replaced') : t('file_uploaded'))
          if (inputRef.current) inputRef.current.value = ''
          return
        }

        if (uploadProvider === 'vimeo') {
          setUploading(false)
          fail(vimeoResult.error ?? 'upload_init_failed')
          return
        }
      }

      if (tryR2) {
        const result = await uploadCourseVideoToR2({
          courseId,
          slot: videoSlot,
          lessonId,
          file,
          onProgress: setProgress,
        })
        setUploading(false)

        if (result.error || !result.assetId) {
          if (result.error !== 'aborted') fail(result.error)
          return
        }

        setDone(true)
        onUploaded(result.assetId, result.durationMinutes)
        toast.success(hasVideo ? t('video_replaced') : t('file_uploaded'))
        if (inputRef.current) inputRef.current.value = ''

        // Transcode online into an adaptive HLS ladder (multi-quality).
        if (enableProcessing && videoSlot === 'lesson' && lessonId) {
          void runProcessing(result.assetId)
        }
        return
      }

      setUploading(false)
      fail('upload_init_failed')
      return
    }

    const result = await uploadCourseFile({
      bucket,
      courseId,
      file,
      onProgress: setProgress,
    })
    setUploading(false)

    if (result.error || !result.url) {
      fail(result.error)
      return
    }

    setDone(true)
    onUploaded(result.url)
    toast.success(hasVideo ? t('video_replaced') : t('file_uploaded'))
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRemove = () => {
    if (!onRemoved) return
    if (!window.confirm(t('confirm_remove_video'))) return

    setDone(false)
    setErrorMessage(null)
    if (inputRef.current) inputRef.current.value = ''
    onRemoved()
    toast.success(t('video_removed'))
  }

  const accept = isVideo
    ? 'video/mp4,video/quicktime,video/x-matroska,video/webm,video/x-msvideo,.mp4,.mov,.mkv,.webm,.avi,.m4v'
    : 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium">{label}</p>}

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

      {hasVideo && !uploading ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">
                {isVideo ? t('video_attached') : t('file_uploaded')}
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
              {t('change_video')}
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
                {t('remove_video')}
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
            <Upload className="h-4 w-4" />
          )}
          {uploading ? t('uploading') : t('upload_video')}
        </Button>
      )}

      {uploading && (
        <div className="space-y-1">
          <Progress value={progress}>
            <ProgressValue />
          </Progress>
          <p className="text-xs text-muted-foreground text-end">
            {hasVideo ? t('replacing_video') : t('uploading')} · {progress}%
          </p>
        </div>
      )}

      {processing && (
        <div className="space-y-1 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {stageLabel(processingStage)}
          </div>
          <Progress value={processingPct}>
            <ProgressValue />
          </Progress>
          <p className="text-xs text-muted-foreground text-end">
            {processingPct}% · {t('processing_hint')}
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
