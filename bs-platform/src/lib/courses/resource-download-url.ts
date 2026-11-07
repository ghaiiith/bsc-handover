export function getCourseResourceDownloadUrl(
  courseId: string,
  resourceId: string
): string {
  return `/api/courses/${courseId}/resources/${resourceId}/download`
}
