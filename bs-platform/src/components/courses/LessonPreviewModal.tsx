'use client'

import SignedVideoPlayer from '@/components/courses/SignedVideoPlayer'
import LessonDocumentViewer from '@/components/courses/LessonDocumentViewer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { LessonType } from '@/types'
import { isDocumentLessonType, isVideoLessonType } from '@/lib/courses/lesson-type-utils'
import { cn } from '@/lib/utils'

interface LessonPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  locale: string
  lessonType: LessonType
  courseId?: string
  lessonId?: string
  documentUrl?: string
}

export default function LessonPreviewModal({
  open,
  onOpenChange,
  title,
  locale,
  lessonType,
  courseId,
  lessonId,
  documentUrl,
}: LessonPreviewModalProps) {
  const showVideo =
    isVideoLessonType(lessonType) && Boolean(courseId && lessonId)
  const showDocument = isDocumentLessonType(lessonType) && documentUrl

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex w-[min(96vw,72rem)] max-w-[min(96vw,72rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-[min(96vw,72rem)] lg:max-w-[min(92vw,80rem)]',
          'max-h-[min(94vh,900px)]'
        )}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-start">
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {showDocument ? (
            <LessonDocumentViewer
              url={documentUrl!}
              title={title}
              locale={locale}
              embedded
            />
          ) : showVideo ? (
            <SignedVideoPlayer
              endpoint={`/api/courses/${courseId}/lessons/${lessonId}/playback`}
              className="w-full"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
