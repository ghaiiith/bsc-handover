// Supabase service-role client + job/asset mutations for the worker.

import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { env } from './env.mjs'

// supabase-js eagerly builds a Realtime client that needs a global WebSocket;
// Node 20 has none natively. The worker never uses realtime, but the client
// constructs it regardless, so polyfill from `ws`.
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket
}

const supabase = createClient(env.supabaseUrl, env.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** Atomically claim the next queued (or stale) job, or null when idle. */
export async function claimNextJob() {
  const { data, error } = await supabase.rpc('claim_next_video_job', {
    p_stale_seconds: 900,
  })
  if (error) throw new Error(`claim_next_video_job failed: ${error.message}`)
  // A function returning a composite row type serializes an empty result as a
  // row of all-null columns (not JSON null) over PostgREST — treat that as idle.
  const job = Array.isArray(data) ? data[0] : data
  if (!job || !job.id) return null
  return job
}

export async function updateJob(jobId, patch) {
  const { error } = await supabase
    .from('video_processing_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) console.error(`[video-worker] updateJob ${jobId}:`, error.message)
}

export async function heartbeat(jobId, progress, stage) {
  await updateJob(jobId, {
    heartbeat_at: new Date().toISOString(),
    progress: Math.max(0, Math.min(100, Math.round(progress))),
    ...(stage ? { stage } : {}),
  })
}

export async function completeJob(jobId, result) {
  await updateJob(jobId, {
    status: 'completed',
    progress: 100,
    stage: 'done',
    error: null,
    renditions: result.renditions,
    master_key: result.masterKey,
    poster_key: result.posterKey,
    duration_seconds: result.durationSeconds,
    finished_at: new Date().toISOString(),
  })
}

export async function failJob(jobId, message) {
  await updateJob(jobId, {
    status: 'failed',
    stage: 'failed',
    error: String(message).slice(0, 2000),
    finished_at: new Date().toISOString(),
  })
}

/**
 * Register the AES-128 content key for a lesson (wrapped key + IV) and flip the
 * lesson to encrypted, so the HLS proxy requires a playback session per segment
 * and the key endpoint gates delivery. Mirrors registerLessonEncryptionKey.
 */
export async function registerEncryptionKey(courseId, lessonSlot, wrappedKeyB64, ivHex) {
  const now = new Date().toISOString()
  const { error: keyErr } = await supabase.from('lesson_encryption_keys').upsert(
    {
      course_id: courseId,
      lesson_id: lessonSlot,
      key_ciphertext: wrappedKeyB64,
      iv_hex: ivHex,
      encryption_method: 'aes-128',
      encryption_version: 1,
      processing_version: 1,
      rotated_at: now,
    },
    { onConflict: 'lesson_id' }
  )
  if (keyErr) throw new Error(`register key failed: ${keyErr.message}`)

  const { error: protErr } = await supabase.from('lesson_content_protection').upsert(
    {
      lesson_id: lessonSlot,
      course_id: courseId,
      encryption_status: 'encrypted',
      protection_status: 'protected',
      updated_at: now,
    },
    { onConflict: 'lesson_id' }
  )
  if (protErr) throw new Error(`register protection failed: ${protErr.message}`)
}

/** Reflect the finished HLS on the video_asset (duration + rendition metadata). */
export async function finalizeAsset(assetId, result) {
  if (!assetId) return
  const { data: existing } = await supabase
    .from('video_assets')
    .select('provider_metadata')
    .eq('id', assetId)
    .maybeSingle()

  const metadata = {
    ...(existing?.provider_metadata ?? {}),
    hls_ready: true,
    hls_master_key: result.masterKey,
    poster_key: result.posterKey,
    renditions: result.renditions,
    processed_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('video_assets')
    .update({
      status: 'ready',
      duration_seconds: result.durationSeconds,
      provider_duration: result.durationSeconds,
      provider_processing_status: 'ready',
      provider_metadata: metadata,
      updated_at: new Date().toISOString(),
      provider_updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
  if (error) console.error(`[video-worker] finalizeAsset ${assetId}:`, error.message)
}
