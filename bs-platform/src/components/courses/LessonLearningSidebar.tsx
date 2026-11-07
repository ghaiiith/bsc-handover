import { Suspense, type ReactNode } from 'react'
import { getLessonResources } from '@/lib/courses/get-lesson-resources'
import { getLessonQaForStudent } from '@/lib/courses/get-lesson-qa'
import { getViewerRole } from '@/lib/auth/get-viewer-role'
import { canUseAiChat } from '@/lib/auth/role-capabilities'
import LessonPlayerToolsPanel from '@/components/courses/LessonPlayerToolsPanel'
import { Skeleton } from '@/components/ui/skeleton'

interface LessonLearningSidebarProps {
  locale: string
  courseId: string
  courseTitle: string
  lessonId: string
  userId: string
  initialTab?: string
  highlightThreadId?: string
  overviewContent?: ReactNode
}

export default async function LessonLearningSidebar({
  locale,
  courseId,
  courseTitle,
  lessonId,
  userId,
  initialTab,
  highlightThreadId,
  overviewContent,
}: LessonLearningSidebarProps) {
  const [resources, qaThread, viewer] = await Promise.all([
    getLessonResources(courseId, lessonId),
    getLessonQaForStudent(courseId, lessonId, userId),
    getViewerRole(),
  ])
  // The in-lesson assistant is a chat surface: open to students too,
  // matching the gate on /api/chat/course-assistant.
  const canAccessAi = canUseAiChat(viewer.role)

  return (
    <Suspense
      fallback={<Skeleton className="h-[420px] w-full rounded-xl" />}
    >
      <LessonPlayerToolsPanel
        locale={locale}
        courseId={courseId}
        courseTitle={courseTitle}
        lessonId={lessonId}
        resources={resources}
        initialTab={initialTab}
        highlightThreadId={highlightThreadId}
        initialQaThread={qaThread}
        canAccessAi={canAccessAi}
        overviewContent={overviewContent}
      />
    </Suspense>
  )
}
