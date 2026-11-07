import { createClient } from '@/lib/supabase/client'
import {
  MAX_VIDEO_SIZE_MB,
  MAX_THUMBNAIL_SIZE_MB,
  MAX_DOCUMENT_SIZE_MB,
} from '@/lib/constants'

export type UploadBucket = 'course-thumbnails' | 'course-videos' | 'course-documents'

interface UploadOptions {
  bucket: UploadBucket
  courseId: string
  file: File
  onProgress?: (percent: number) => void
}

// Online transcoding accepts common source formats; the server converts them
// to an adaptive HLS ladder, so we no longer restrict input to MP4.
const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
  'video/x-msvideo',
  'video/x-m4v',
  'video/mpeg',
]

const THUMBNAIL_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'mpeg', 'mpg'])
const THUMBNAIL_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
// Slide decks (report BS-30) are course documents too.
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'ppt', 'pptx'])

const RESOURCE_MIME_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]

const RESOURCE_EXTENSIONS = new Set([
  'pdf',
  'zip',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'json',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'svg',
])

const MAX_SIZE_MB: Record<UploadBucket, number> = {
  'course-thumbnails': MAX_THUMBNAIL_SIZE_MB,
  'course-videos': MAX_VIDEO_SIZE_MB,
  'course-documents': MAX_DOCUMENT_SIZE_MB,
}

function getFileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function isAllowedFile(bucket: UploadBucket, file: File): boolean {
  const ext = getFileExtension(file)
  if (bucket === 'course-thumbnails') {
    return (
      THUMBNAIL_MIME_TYPES.includes(file.type) ||
      THUMBNAIL_EXTENSIONS.has(ext)
    )
  }
  if (bucket === 'course-documents') {
    return DOCUMENT_MIME_TYPES.includes(file.type) || DOCUMENT_EXTENSIONS.has(ext)
  }
  return (
    VIDEO_MIME_TYPES.includes(file.type) || VIDEO_EXTENSIONS.has(ext)
  )
}

export function validateResourceFile(file: File): string | null {
  const ext = getFileExtension(file)
  const allowed =
    RESOURCE_MIME_TYPES.includes(file.type) || RESOURCE_EXTENSIONS.has(ext)
  if (!allowed) {
    return 'invalid_type'
  }

  const maxBytes = MAX_DOCUMENT_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return 'file_too_large'
  }

  return null
}

export function validateUploadFile(
  bucket: UploadBucket,
  file: File
): string | null {
  if (!isAllowedFile(bucket, file)) {
    return 'invalid_type'
  }

  const maxBytes = MAX_SIZE_MB[bucket] * 1024 * 1024
  if (file.size > maxBytes) {
    return 'file_too_large'
  }

  return null
}

export function getUploadErrorKey(error?: string): string {
  switch (error) {
    case 'invalid_type':
      return 'upload_invalid_type'
    case 'file_too_large':
      return 'upload_file_too_large'
    case 'unauthorized':
      return 'upload_unauthorized'
    case 'storage_not_configured':
      return 'storage_not_configured'
    case 'storage_unreachable':
      return 'storage_unreachable'
    case 'upload_init_failed':
    case 'upload_failed':
    case 'upload_complete_failed':
      return 'video_upload_failed'
    default:
      return 'upload_error'
  }
}

async function uploadDocumentToSupabase(
  courseId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string | null; error?: string }> {
  const supabase = createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return { url: null, error: 'unauthorized' }
  }

  const ext = getFileExtension(file) || 'pdf'
  const path = `${authData.user.id}/${courseId}/${Date.now()}.${ext}`
  const contentType = file.type || 'application/pdf'

  onProgress?.(15)

  const { error } = await supabase.storage.from('course-documents').upload(path, file, {
    upsert: true,
    contentType,
  })

  if (error) {
    console.error('[upload] document failed:', error.message)
    return { url: null, error: error.message }
  }

  onProgress?.(100)
  const { data } = supabase.storage.from('course-documents').getPublicUrl(path)
  return { url: data.publicUrl }
}

export async function uploadCourseResourceFile({
  courseId,
  file,
  onProgress,
}: {
  courseId: string
  file: File
  onProgress?: (percent: number) => void
}): Promise<{ url: string | null; fileSizeBytes: number; error?: string }> {
  const validationError = validateResourceFile(file)
  if (validationError) {
    return { url: null, fileSizeBytes: 0, error: validationError }
  }

  const result = await uploadDocumentToSupabase(courseId, file, onProgress)
  return {
    url: result.url,
    fileSizeBytes: file.size,
    error: result.error,
  }
}

async function uploadThumbnailToSupabase(
  courseId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string | null; error?: string }> {
  const supabase = createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return { url: null, error: 'unauthorized' }
  }

  const ext = getFileExtension(file) || 'jpg'
  const path = `${authData.user.id}/${courseId}/${Date.now()}.${ext}`
  const contentType = file.type || 'image/jpeg'

  onProgress?.(15)

  const { error } = await supabase.storage.from('course-thumbnails').upload(path, file, {
    upsert: true,
    contentType,
  })

  if (error) {
    console.error('[upload] thumbnail failed:', error.message)
    return { url: null, error: error.message }
  }

  onProgress?.(100)
  const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(path)
  return { url: data.publicUrl }
}

export async function uploadCourseFile({
  bucket,
  courseId,
  file,
  onProgress,
}: UploadOptions): Promise<{ url: string | null; error?: string }> {
  const validationError = validateUploadFile(bucket, file)
  if (validationError) {
    return { url: null, error: validationError }
  }

  if (bucket === 'course-videos') {
    // Videos use the dedicated R2 multipart uploader (see r2-video-upload.ts).
    return { url: null, error: 'invalid_type' }
  }

  if (bucket === 'course-documents') {
    return uploadDocumentToSupabase(courseId, file, onProgress)
  }

  return uploadThumbnailToSupabase(courseId, file, onProgress)
}

export function getVideoDurationMinutes(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      const minutes = Math.max(1, Math.ceil(video.duration / 60))
      resolve(minutes)
    }
    video.onerror = () => resolve(null)
    video.src = URL.createObjectURL(file)
  })
}
