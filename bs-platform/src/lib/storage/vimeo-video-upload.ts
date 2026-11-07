'use client'

import { MAX_VIDEO_SIZE_MB, VIDEO_UPLOAD_PART_SIZE_MB } from '@/lib/constants'

export interface VimeoUploadResult {
  assetId: string
  error?: string
  durationMinutes?: number
}

interface CreateUploadResponse {
  assetId: string
  provider: 'vimeo' | 'r2'
  uploadLink?: string
  vimeoVideoId?: string
  uploadApproach?: 'tus' | 'post'
  key?: string
  uploadId?: string
  parts?: Array<{ partNumber: number; url: string }>
}

/** Browser uploads directly to Vimeo via TUS — file never passes through Next.js. */
export async function uploadCourseVideoToVimeo(input: {
  courseId: string
  slot: 'lesson' | 'preview'
  lessonId?: string | null
  file: File
  onProgress?: (percent: number) => void
}): Promise<VimeoUploadResult> {
  const createRes = await fetch(
    `/api/instructor/courses/${input.courseId}/videos/create-upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot: input.slot,
        lessonId: input.lessonId,
        filename: input.file.name,
        contentType: input.file.type || 'video/mp4',
        fileSize: input.file.size,
        provider: 'vimeo',
      }),
    }
  )

  if (!createRes.ok) {
    return { assetId: '', error: 'upload_init_failed' }
  }

  const created = (await createRes.json()) as CreateUploadResponse
  if (created.provider !== 'vimeo' || !created.uploadLink || !created.vimeoVideoId) {
    return { assetId: '', error: 'vimeo_upload_unavailable' }
  }

  await tusUpload(created.uploadLink, input.file, input.onProgress)

  const completeRes = await fetch(
    `/api/instructor/courses/${input.courseId}/videos/complete-upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId: created.assetId,
        vimeoVideoId: created.vimeoVideoId,
      }),
    }
  )

  if (!completeRes.ok) {
    return { assetId: created.assetId, error: 'upload_complete_failed' }
  }

  const completed = (await completeRes.json()) as {
    durationSeconds?: number
  }

  const durationMinutes = completed.durationSeconds
    ? Math.max(1, Math.ceil(completed.durationSeconds / 60))
    : undefined

  return { assetId: created.assetId, durationMinutes }
}

async function tusUpload(
  uploadLink: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  const chunkSize = VIDEO_UPLOAD_PART_SIZE_MB * 1024 * 1024
  let offset = 0

  const headRes = await fetch(uploadLink, { method: 'HEAD' })
  const uploadOffset = headRes.headers.get('Upload-Offset')
  if (uploadOffset) offset = parseInt(uploadOffset, 10)

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize)
    const patchRes = await fetch(uploadLink, {
      method: 'PATCH',
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': String(offset),
        'Content-Type': 'application/offset+octet-stream',
      },
      body: chunk,
    })

    if (!patchRes.ok) {
      throw new Error('tus_upload_failed')
    }

    const newOffset = patchRes.headers.get('Upload-Offset')
    offset = newOffset ? parseInt(newOffset, 10) : offset + chunk.size
    onProgress?.(Math.min(99, Math.round((offset / file.size) * 100)))
  }

  onProgress?.(100)
}

export function validateVideoFile(file: File): string | null {
  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) return 'file_too_large'
  if (!file.type.startsWith('video/')) return 'invalid_type'
  return null
}
