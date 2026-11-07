import { buildNotificationType, NotificationKind } from '@/lib/notifications/types'
import { notifyAndEmail } from '@/lib/notify'

function preview(text: string, max = 120): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

export interface NotifyInstructorLessonQuestionInput {
  instructorId: string
  courseId: string
  threadId: string
  studentName: string
  lessonTitle: string
  lessonTitleAr: string
  courseTitle: string
  courseTitleAr: string
  questionPreview: string
}

export async function notifyInstructorOfLessonQuestion(
  input: NotifyInstructorLessonQuestionInput
): Promise<void> {
  const snippet = preview(input.questionPreview)

  await notifyAndEmail({
    userId: input.instructorId,
    title: 'New lesson question',
    titleAr: 'سؤال جديد عن الدرس',
    body: `${input.studentName} asked about "${input.lessonTitle}" in ${input.courseTitle}: ${snippet}`,
    bodyAr: `سأل ${input.studentName} عن "${input.lessonTitleAr}" في ${input.courseTitleAr}: ${snippet}`,
    type: buildNotificationType(
      NotificationKind.lessonQuestion,
      input.courseId,
      input.threadId
    ),
  })
}

export interface NotifyStudentLessonAnswerInput {
  studentId: string
  courseId: string
  threadId: string
  lessonId: string
  courseSlug: string
  lessonSlug: string
  lessonTitle: string
  lessonTitleAr: string
  courseTitle: string
  courseTitleAr: string
  answerPreview: string
}

export async function notifyStudentOfLessonAnswer(
  input: NotifyStudentLessonAnswerInput
): Promise<void> {
  const snippet = preview(input.answerPreview)

  await notifyAndEmail({
    userId: input.studentId,
    title: 'Your question was answered',
    titleAr: 'تمت الإجابة على سؤالك',
    body: `Your instructor replied in "${input.lessonTitle}" (${input.courseTitle}): ${snippet}`,
    bodyAr: `أجاب المدرب في "${input.lessonTitleAr}" (${input.courseTitleAr}): ${snippet}`,
    type: buildNotificationType(
      NotificationKind.lessonAnswer,
      input.courseSlug,
      input.lessonSlug,
      input.threadId
    ),
  })
}
