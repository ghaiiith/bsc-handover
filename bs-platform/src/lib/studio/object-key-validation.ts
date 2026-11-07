import 'server-only'

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates studio upload keys against the Phase 1/2 bucket layout.
 * Keys must live under courses/{courseId}/{lessonSlot}/...
 */
export function validateStudioObjectKey(
  courseId: string,
  objectKey: string
): string | null {
  if (!UUID.test(courseId)) return 'invalid_course_id'
  if (!objectKey || objectKey.includes('..') || objectKey.startsWith('/')) {
    return 'invalid_object_key'
  }

  const expectedPrefix = `courses/${courseId}/`
  if (!objectKey.startsWith(expectedPrefix)) {
    return 'object_key_outside_course'
  }

  const remainder = objectKey.slice(expectedPrefix.length)
  const slot = remainder.split('/')[0]
  if (!slot || (!UUID.test(slot) && slot !== 'preview')) {
    return 'invalid_lesson_slot'
  }

  const allowedRoots = ['source/', 'hls/', 'thumbnails/', 'metadata/']
  if (!allowedRoots.some((root) => remainder.includes(`/${root}`))) {
    return 'invalid_asset_folder'
  }

  return null
}

export function isSourceVideoKey(objectKey: string): boolean {
  return /\/source\/video\.mp4$/.test(objectKey)
}
