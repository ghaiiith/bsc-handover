'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VideoUpload from '@/components/courses/VideoUpload'
import { saveCourseStep2 } from '@/lib/instructor/course-wizard-actions'
import { toast } from 'sonner'

interface Step2MediaProps {
  locale: string
  courseId: string
  thumbnailUrl: string | null
  previewVideoUrl: string | null
  thumbnailPrompt?: string | null
  onThumbnailChange: (url: string) => void
  onPreviewVideoChange: (url: string) => void
  onComplete: () => void
  onBack?: () => void
  standalone?: boolean
}

export default function Step2Media({
  locale,
  courseId,
  thumbnailUrl,
  previewVideoUrl,
  thumbnailPrompt,
  onThumbnailChange,
  onPreviewVideoChange,
  onComplete,
  onBack,
  standalone = false,
}: Step2MediaProps) {
  const t = useTranslations('instructor')
  const tAi = useTranslations('courseAi')
  const [loading, setLoading] = useState(false)

  const handleNext = async () => {
    setLoading(true)
    const result = await saveCourseStep2(
      courseId,
      thumbnailUrl,
      previewVideoUrl,
      locale
    )
    setLoading(false)

    if (!result.success) {
      toast.error(t('save_error'))
      return
    }

    if (standalone) {
      toast.success(t('course_save_success'))
    }

    onComplete()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-medium">{t('thumbnail')}</p>
          {thumbnailUrl && (
            <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
              <Image
                src={thumbnailUrl}
                alt="Thumbnail"
                fill
                className="object-cover"
                sizes="320px"
              />
            </div>
          )}
          <VideoUpload
            courseId={courseId}
            bucket="course-thumbnails"
            currentUrl={thumbnailUrl}
            onUploaded={(url) => onThumbnailChange(url)}
            label={t('upload_thumbnail')}
          />
          <p className="text-xs text-muted-foreground">{t('thumbnail_hint')}</p>
          {thumbnailPrompt && (
            <div className="rounded-lg border border-dashed border-orange-500/40 bg-orange-500/5 p-3 space-y-1">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                {tAi('thumbnail_prompt_label')}
              </p>
              <p className="text-xs text-muted-foreground">{thumbnailPrompt}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">{t('preview_video')}</p>
          <VideoUpload
            courseId={courseId}
            bucket="course-videos"
            videoSlot="preview"
            currentUrl={previewVideoUrl}
            onUploaded={(assetId) => onPreviewVideoChange(assetId)}
            label={t('upload_preview_video')}
          />
          <p className="text-xs text-muted-foreground">{t('preview_video_hint')}</p>
        </div>
      </div>

      <div className={`flex pt-4 ${standalone ? 'justify-end' : 'justify-between'}`}>
        {!standalone && onBack && (
          <Button type="button" variant="outline" onClick={onBack}>
            {t('back_step')}
          </Button>
        )}
        <Button type="button" onClick={handleNext} disabled={loading}>
          {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {standalone ? t('save_changes') : t('next_step')}
        </Button>
      </div>
    </div>
  )
}
