'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CoursePreviewPlayer from '@/components/courses/CoursePreviewPlayer'

interface AdminCoursePreviewDialogProps {
  courseId: string
  title: string
  poster?: string | null
}

/**
 * Report BS-97: administrators reviewed courses without ever seeing the video.
 *
 * The admin courses table listed the video provider, status, duration, storage
 * and cost — every fact about the media except the media itself — so a course
 * was approved or rejected on metadata alone. This plays the saved source in
 * place, with the player's normal controls, and says plainly when no preview is
 * configured or the asset is still processing.
 *
 * The player is mounted only while the dialog is open, so the table does not
 * open a signed playback session for every row it renders.
 */
export default function AdminCoursePreviewDialog({
  courseId,
  title,
  poster,
}: AdminCoursePreviewDialogProps) {
  const t = useTranslations('admin')
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* This project's DialogTrigger has no `asChild`, so the button is plain. */}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="gap-1"
        onClick={() => setOpen(true)}
        title={t('preview_video')}
      >
        <PlayCircle className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">{t('preview_video')}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{title}</DialogTitle>
          </DialogHeader>
          {open && (
            <CoursePreviewPlayer
              courseId={courseId}
              poster={poster}
              title={title}
              className="overflow-hidden rounded-lg border"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
