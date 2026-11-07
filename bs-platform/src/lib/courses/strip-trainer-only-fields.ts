import type { Lesson } from '@/types'

/**
 * Report BS-31: the trainer notes box is trainer-only for now. Lesson rows are
 * fetched with `select('*')` in places, so anything student-facing must pass
 * through here before it reaches a client component.
 */
export function stripTrainerOnlyFields(lesson: Lesson): Lesson {
  if (lesson.trainer_notes_html === undefined) return lesson
  const { trainer_notes_html: _notes, ...rest } = lesson
  return rest as Lesson
}

export function stripTrainerOnlyFieldsFromList(lessons: Lesson[]): Lesson[] {
  return lessons.map(stripTrainerOnlyFields)
}
