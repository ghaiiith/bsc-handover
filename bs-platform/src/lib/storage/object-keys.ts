/**
 * Canonical object-key layout for course media in the storage bucket.
 *
 * Layout (kept stable for the whole roadmap):
 *
 *   courses/{courseId}/{lessonSlot}/source/video.mp4
 *
 * where `lessonSlot` is a lesson id, or the literal `preview` for a course
 * trailer. Phase 2 will add sibling folders WITHOUT touching `source/`:
 *
 *   courses/{courseId}/{lessonSlot}/hls/master.m3u8
 *   courses/{courseId}/{lessonSlot}/thumbnails/...
 *   courses/{courseId}/{lessonSlot}/metadata/...
 *
 * Only `sourceVideoKey` is used in Phase 1; the other builders exist so future
 * phases have a single source of truth for paths.
 */

export const PREVIEW_SLOT = 'preview'

export type VideoSlot = 'lesson' | 'preview'

/** Resolve the folder segment for a given slot. */
export function resolveLessonSlot(slot: VideoSlot, lessonId?: string | null): string {
  if (slot === 'preview') return PREVIEW_SLOT
  if (!lessonId) {
    throw new Error('lessonId is required for a lesson video slot')
  }
  return lessonId
}

function slotBase(courseId: string, lessonSlot: string): string {
  return `courses/${courseId}/${lessonSlot}`
}

export function sourceVideoKey(courseId: string, lessonSlot: string): string {
  return `${slotBase(courseId, lessonSlot)}/source/video.mp4`
}

// ── Reserved for Phase 2 (not used yet) ─────────────────────────────────────
export function hlsPrefix(courseId: string, lessonSlot: string): string {
  return `${slotBase(courseId, lessonSlot)}/hls/`
}

export function hlsMasterKey(courseId: string, lessonSlot: string): string {
  return `${hlsPrefix(courseId, lessonSlot)}master.m3u8`
}

/** Build the R2 object key for a relative path inside the lesson HLS folder. */
export function hlsObjectKey(
  courseId: string,
  lessonSlot: string,
  relativePath: string
): string {
  return `${hlsPrefix(courseId, lessonSlot)}${relativePath}`
}

export function thumbnailsPrefix(courseId: string, lessonSlot: string): string {
  return `${slotBase(courseId, lessonSlot)}/thumbnails/`
}

export function metadataPrefix(courseId: string, lessonSlot: string): string {
  return `${slotBase(courseId, lessonSlot)}/metadata/`
}

/** Everything for a given lesson/preview slot (used for cleanup). */
export function slotPrefix(courseId: string, lessonSlot: string): string {
  return `${slotBase(courseId, lessonSlot)}/`
}
