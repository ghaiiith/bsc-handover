export type StudioSection =
  | 'overview'
  | 'information'
  | 'curriculum'
  | 'resources'
  | 'quizzes'
  | 'certificates'
  | 'students'
  | 'reviews'
  | 'qa'
  | 'analytics'
  | 'settings'

export function studioBasePath(locale: string, courseId: string): string {
  return `/${locale}/instructor/courses/${courseId}/studio`
}

export function studioSectionPath(
  locale: string,
  courseId: string,
  section: StudioSection
): string {
  const base = studioBasePath(locale, courseId)
  return section === 'overview' ? base : `${base}/${section}`
}
