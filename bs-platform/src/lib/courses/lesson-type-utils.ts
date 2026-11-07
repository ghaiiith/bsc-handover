import type { LessonType } from '@/types'

export function isVideoLessonType(type?: LessonType | null): boolean {
  const lessonType = type ?? 'video'
  return lessonType === 'video' || lessonType === 'live'
}

export function isDocumentLessonType(type?: LessonType | null): boolean {
  const lessonType = type ?? 'video'
  return lessonType === 'pdf' || lessonType === 'download'
}
