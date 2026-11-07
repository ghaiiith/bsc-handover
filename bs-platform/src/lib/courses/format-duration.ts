export interface DurationLabels {
  minutes: string
  hours: string
  /** Singular hour label (e.g. "hour"); falls back to `hours` when omitted. */
  hour?: string
}

export interface LessonDurationSource {
  duration_minutes: number
}

export interface SectionDurationSource {
  lessons: LessonDurationSource[]
}

/** Sum lesson durations across all curriculum sections. */
export function sumCurriculumDurationMinutes(
  sections: SectionDurationSource[]
): number {
  return sections.reduce(
    (total, section) =>
      total +
      section.lessons.reduce(
        (sectionTotal, lesson) => sectionTotal + Math.max(0, lesson.duration_minutes ?? 0),
        0
      ),
    0
  )
}

/** Count lessons listed in the curriculum sections. */
export function countCurriculumLessons(sections: SectionDurationSource[]): number {
  return sections.reduce((total, section) => total + section.lessons.length, 0)
}

/** Exact duration — minutes only below 1 hour; hours + minutes when 1h or more (no rounding). */
export function formatDurationMinutes(
  totalMinutes: number,
  labels: DurationLabels
): string {
  const minutes = Math.max(0, Math.floor(totalMinutes))
  if (minutes === 0) return `0 ${labels.minutes}`
  if (minutes < 60) return `${minutes} ${labels.minutes}`

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  const hourWord = hours === 1 ? (labels.hour ?? labels.hours) : labels.hours

  if (remainder === 0) return `${hours} ${hourWord}`
  return `${hours} ${hourWord} ${remainder} ${labels.minutes}`
}
