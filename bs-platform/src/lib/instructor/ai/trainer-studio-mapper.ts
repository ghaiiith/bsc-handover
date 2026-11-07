import type { AiCourseStructure } from '@/types/course-ai'
import type { TsCourse } from '@/lib/instructor/ai/trainer-studio-server'

function clampDuration(min: number | null | undefined): number {
  const n = typeof min === 'number' && Number.isFinite(min) ? Math.round(min) : 10
  return Math.min(120, Math.max(1, n))
}

function pad(text: string | undefined, min: number, fallback: string): string {
  const t = (text ?? '').trim()
  if (t.length >= min) return t
  return (t || fallback).padEnd(min, ' ').slice(0, Math.max(min, (t || fallback).length))
}

function lessonDescription(l: { summary?: string; key_points?: string[] }): string {
  const summary = l.summary?.trim()
  if (summary) return summary
  const points = (l.key_points ?? []).filter(Boolean)
  return points.length ? points.join(' • ') : ''
}

/**
 * Map one (single-language) or two (Arabic + English) TrainerStudio course
 * outlines into the platform's bilingual `AiCourseStructure`. When only one
 * course is supplied its content is mirrored into both language fields (a draft
 * the instructor then translates/edits).
 */
export function mapTrainerCourseToStructure(
  courseAr: TsCourse,
  courseEn?: TsCourse
): AiCourseStructure {
  const en = courseEn ?? courseAr
  const modulesAr = courseAr.modules ?? []
  const modulesEn = en.modules ?? []

  let totalMinutes = 0

  const sections = modulesAr.map((mAr, i) => {
    const mEn = modulesEn[i] ?? mAr
    const lessonsAr = mAr.lessons ?? []
    const lessonsEn = mEn.lessons ?? []

    const lessons = lessonsAr.map((lAr, j) => {
      const lEn = lessonsEn[j] ?? lAr
      const duration = clampDuration(lAr.duration_min ?? lEn.duration_min)
      totalMinutes += duration
      const descAr = lessonDescription(lAr)
      const descEn = lessonDescription(lEn)
      return {
        title_ar: (lAr.title ?? 'درس').trim() || 'درس',
        title_en: (lEn.title ?? 'Lesson').trim() || 'Lesson',
        duration_estimate_minutes: duration,
        description_ar: descAr || descEn || '—',
        description_en: descEn || descAr || '—',
        is_free_preview: i === 0 && j === 0,
      }
    })

    return {
      title_ar: (mAr.title ?? 'الوحدة').trim() || 'الوحدة',
      title_en: (mEn.title ?? 'Module').trim() || 'Module',
      lessons: lessons.length
        ? lessons
        : [
            {
              title_ar: (mAr.title ?? 'درس').trim() || 'درس',
              title_en: (mEn.title ?? 'Lesson').trim() || 'Lesson',
              duration_estimate_minutes: 10,
              description_ar: mAr.summary?.trim() || '—',
              description_en: mEn.summary?.trim() || '—',
              is_free_preview: i === 0,
            },
          ],
    }
  })

  const outcomesAr = (courseAr.outcomes ?? []).filter(Boolean)
  const outcomesEn = (en.outcomes ?? []).filter(Boolean)

  const descAr = pad(courseAr.description, 20, courseAr.title ?? 'وصف الكورس')
  const descEn = pad(en.description, 20, en.title ?? 'Course description')
  const thumbPrompt = pad(
    courseAr.cover?.prompt || courseAr.cover?.concept || `Course cover for "${en.title ?? courseAr.title ?? 'course'}"`,
    10,
    'Professional course cover illustration'
  )

  return {
    sections: sections.length
      ? sections
      : [
          {
            title_ar: courseAr.title ?? 'الوحدة الأولى',
            title_en: en.title ?? 'Module 1',
            lessons: [
              {
                title_ar: 'مقدمة',
                title_en: 'Introduction',
                duration_estimate_minutes: 10,
                description_ar: descAr,
                description_en: descEn,
                is_free_preview: true,
              },
            ],
          },
        ],
    learning_outcomes_ar: outcomesAr.length ? outcomesAr : outcomesEn.length ? outcomesEn : ['إتقان أساسيات الموضوع'],
    learning_outcomes_en: outcomesEn.length ? outcomesEn : outcomesAr.length ? outcomesAr : ['Master the fundamentals'],
    description_ar: descAr,
    description_en: descEn,
    thumbnail_prompt: thumbPrompt,
    estimated_total_hours: Math.max(0.5, Math.round((totalMinutes / 60) * 2) / 2),
  }
}
