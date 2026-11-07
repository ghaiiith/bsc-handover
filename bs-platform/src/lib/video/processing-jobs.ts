import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type VideoJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'canceled'

export interface VideoProcessingJob {
  id: string
  asset_id: string | null
  course_id: string
  lesson_slot: string
  status: VideoJobStatus
  progress: number
  stage: string | null
  error: string | null
  renditions: { height: number; bitrateKbps: number }[]
  duration_seconds: number | null
  created_at: string
  updated_at: string
}

const JOB_COLUMNS =
  'id, asset_id, course_id, lesson_slot, status, progress, stage, error, renditions, duration_seconds, created_at, updated_at'

export interface CreateProcessingJobInput {
  assetId: string
  courseId: string
  lessonSlot: string
  sourceKey: string
  createdBy: string
}

/**
 * Enqueue a transcode job. If an unfinished job already exists for the same
 * (course, slot), it is reused so re-uploads don't pile up duplicates.
 */
export async function createProcessingJob(
  input: CreateProcessingJobInput
): Promise<VideoProcessingJob | null> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('video_processing_jobs')
    .select(JOB_COLUMNS)
    .eq('course_id', input.courseId)
    .eq('lesson_slot', input.lessonSlot)
    .in('status', ['queued', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return existing as VideoProcessingJob

  const { data, error } = await admin
    .from('video_processing_jobs')
    .insert({
      asset_id: input.assetId,
      course_id: input.courseId,
      lesson_slot: input.lessonSlot,
      source_key: input.sourceKey,
      status: 'queued',
      progress: 0,
      created_by: input.createdBy,
    })
    .select(JOB_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[video-jobs] create failed:', error?.message)
    return null
  }
  return data as VideoProcessingJob
}

export async function getProcessingJob(
  jobId: string
): Promise<VideoProcessingJob | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('video_processing_jobs')
    .select(JOB_COLUMNS)
    .eq('id', jobId)
    .maybeSingle()
  if (error || !data) return null
  return data as VideoProcessingJob
}

/** Latest job for a lesson/preview slot (for showing status on load). */
export async function getLatestJobForSlot(
  courseId: string,
  lessonSlot: string
): Promise<VideoProcessingJob | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('video_processing_jobs')
    .select(JOB_COLUMNS)
    .eq('course_id', courseId)
    .eq('lesson_slot', lessonSlot)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as VideoProcessingJob) ?? null
}
