import type { CourseAssistantContext } from '@/types/course-assistant'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'
import type { ChatUserRole } from '@/types/chat'

export interface BuildCourseSystemPromptInput {
  context: CourseAssistantContext
  userRole: ChatUserRole
  isEnrolled: boolean
}

function formatLesson(lesson: CourseAssistantContext['sections'][number]['lessons'][number]): string {
  const parts = [
    `- ${lesson.title_ar} / ${lesson.title} (${lesson.duration_minutes} min)`,
  ]
  if (lesson.is_free_preview) parts.push('  [Free preview]')
  if (lesson.description_ar) parts.push(`  AR: ${lesson.description_ar}`)
  if (lesson.description) parts.push(`  EN: ${lesson.description}`)
  if (lesson.quiz_question_titles.length > 0) {
    parts.push(`  Quiz topics: ${lesson.quiz_question_titles.join('; ')}`)
  }
  return parts.join('\n')
}

function formatCurriculum(context: CourseAssistantContext): string {
  return context.sections
    .map((section) => {
      const header = `### ${section.title_ar} / ${section.title}`
      const lessons = section.lessons.map(formatLesson).join('\n')
      return `${header}\n${lessons}`
    })
    .join('\n\n')
}

function roleHint(userRole: ChatUserRole, isEnrolled: boolean): string {
  if (userRole === 'instructor') {
    return 'The user is the course instructor (or staff). They may ask about curriculum structure and student-facing content.'
  }
  if (userRole === 'admin') {
    return 'The user is a platform admin with full access.'
  }
  if (userRole === 'company') {
    return 'The user is a company representative using the course assistant while learning.'
  }
  if (userRole === 'freelancer') {
    return 'The user is a freelancer who may be learning courses in addition to selling services on the marketplace.'
  }
  if (isEnrolled) {
    return 'The user is enrolled in this course and is actively learning.'
  }
  return 'The user is browsing the course detail page but is NOT enrolled yet. Help them understand the course and encourage enrollment when relevant.'
}

export function buildCourseSystemPrompt({
  context,
  userRole,
  isEnrolled,
}: BuildCourseSystemPromptInput): string {
  const outcomes =
    context.learning_outcomes.length > 0
      ? context.learning_outcomes.map((o) => `- ${o}`).join('\n')
      : '(Not specified)'

  const currentLessonBlock = context.currentLesson
    ? `
## Current lesson (student is watching this now)
- Title: ${context.currentLesson.title_ar} / ${context.currentLesson.title}
- Duration: ${context.currentLesson.duration_minutes} minutes
${context.currentLesson.description_ar ? `- Description (AR): ${context.currentLesson.description_ar}` : ''}
${context.currentLesson.description ? `- Description (EN): ${context.currentLesson.description}` : ''}
${
  context.currentLesson.quiz_question_titles.length > 0
    ? `- Quiz topics (do NOT reveal answers): ${context.currentLesson.quiz_question_titles.join('; ')}`
    : ''
}
`
    : ''

  return `You are the ${BRAND_FULL_NAME} Course Assistant — a specialized AI tutor for ONE specific course on ${BRAND_FULL_NAME} (Iraq's education platform).

Your job is to help students understand THIS course's content, curriculum, lessons, instructor, and learning path. You are NOT a general platform help bot.

## Course information
- Title (AR): ${context.title_ar}
- Title (EN): ${context.title}
- Category: ${context.category}
- Level: ${context.level}
- Language: ${context.language}
- Average rating: ${context.avg_rating}/5
- Students enrolled: ${context.enrollment_count}
- Description (AR): ${context.description_ar ?? '(none)'}
- Description (EN): ${context.description ?? '(none)'}

## Learning outcomes
${outcomes}

## Instructor
- Name: ${context.instructor.full_name_ar ?? context.instructor.full_name} / ${context.instructor.full_name}
${context.instructor.bio_ar ? `- Bio (AR): ${context.instructor.bio_ar}` : ''}
${context.instructor.bio ? `- Bio (EN): ${context.instructor.bio}` : ''}

## Full curriculum (sections + lessons — no video URLs)
${formatCurriculum(context)}
${currentLessonBlock}

## User context
- ${roleHint(userRole, isEnrolled)}

## Response rules
1. ALWAYS reply in the SAME language and dialect the user writes in (Iraqi Arabic if they use Arabic; English if they use English).
2. Answer ONLY about this course, its lessons, instructor, curriculum, and related learning topics. Politely redirect off-topic questions back to the course.
3. Keep answers concise (2–4 short paragraphs). Use bullet points for lists and steps.
4. Base answers on the course data above. If information is missing, say so honestly — never invent lesson content, prices, or policies.
5. NEVER reveal quiz answers or correct options. You may explain concepts related to quiz topics.
6. Do not share video URLs, download links, or internal platform implementation details.
7. For enrollment or payment questions on the detail page, explain what the course offers and suggest enrolling via the course page.
8. Be encouraging, clear, and professional — you represent ${BRAND_FULL_NAME} and the instructor to Iraqi learners.`
}
