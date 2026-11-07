// Standalone video-processing worker.
// Claims queued jobs, transcodes the raw upload into an adaptive HLS ladder,
// uploads it to R2, and reports progress. Runs one job at a time (x264 is
// CPU-heavy); scale out by running more instances if ever needed.
//
//   node workers/video-processor/index.mjs
//
// Requires: ffmpeg/ffprobe on PATH (or FFMPEG_PATH/FFPROBE_PATH) and the same
// R2 + Supabase env the app uses.

import { mkdir, rm, readdir } from 'node:fs/promises'
import path from 'node:path'
import { env } from './env.mjs'
import { downloadToFile, uploadFile } from './r2.mjs'
import { probe, planRenditions, transcodeToHls, makePoster } from './ffmpeg.mjs'
import { prepareEncryption } from './encrypt.mjs'
import {
  claimNextJob,
  heartbeat,
  completeJob,
  failJob,
  finalizeAsset,
  registerEncryptionKey,
} from './db.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function slotBase(courseId, slot) {
  return `courses/${courseId}/${slot}`
}

async function uploadHlsTree(hlsDir, courseId, slot) {
  const entries = await readdir(hlsDir, { recursive: true, withFileTypes: true })
  const files = entries.filter((e) => e.isFile())
  let done = 0
  for (const e of files) {
    const abs = path.join(e.parentPath ?? e.path, e.name)
    const rel = path.relative(hlsDir, abs).split(path.sep).join('/')
    await uploadFile(abs, `${slotBase(courseId, slot)}/hls/${rel}`)
    done++
  }
  return done
}

async function processJob(job) {
  const jobDir = path.join(env.workDir, job.id)
  const sourcePath = path.join(jobDir, 'source')
  const hlsDir = path.join(jobDir, 'hls')
  const posterPath = path.join(jobDir, 'poster.jpg')

  console.log(`[video-worker] job ${job.id}: course=${job.course_id} slot=${job.lesson_slot}`)

  try {
    await mkdir(jobDir, { recursive: true })

    await heartbeat(job.id, 2, 'analyzing')
    await downloadToFile(job.source_key, sourcePath)

    const info = await probe(sourcePath)
    if (info.durationSeconds <= 0) throw new Error('could not read video duration')
    const renditions = planRenditions(info.height || 720)
    console.log(
      `[video-worker] ${job.id}: ${info.width}x${info.height} ${info.durationSeconds}s ` +
        `audio=${info.hasAudio} -> ${renditions.map((r) => `${r.height}p`).join(', ')}`
    )

    // AES-128 encrypt lesson videos (not course previews — the key endpoint is
    // lesson-scoped). Key/keyinfo live in jobDir, never in hlsDir → never uploaded.
    const enc = job.lesson_slot === 'preview' ? null : await prepareEncryption(jobDir)

    await heartbeat(job.id, 5, 'transcoding')
    let lastBeat = 0
    await transcodeToHls(
      sourcePath,
      hlsDir,
      renditions,
      info.hasAudio,
      info.durationSeconds,
      (fraction) => {
        const pct = 5 + fraction * 80 // 5..85
        const now = Date.now()
        if (now - lastBeat > 4000) {
          lastBeat = now
          void heartbeat(job.id, pct, 'transcoding')
        }
      },
      enc?.keyInfoPath ?? null
    )

    await heartbeat(job.id, 86, 'transcoding')
    await makePoster(sourcePath, posterPath, info.durationSeconds)

    await heartbeat(job.id, 88, 'uploading')
    const uploaded = await uploadHlsTree(hlsDir, job.course_id, job.lesson_slot)
    await uploadFile(posterPath, `${slotBase(job.course_id, job.lesson_slot)}/thumbnails/poster.jpg`)
    console.log(`[video-worker] ${job.id}: uploaded ${uploaded} HLS files + poster`)

    await heartbeat(job.id, 96, 'finalizing')
    // Register the content key so the lesson is encrypted + session-gated.
    if (enc) {
      await registerEncryptionKey(job.course_id, job.lesson_slot, enc.wrappedKey, enc.ivHex)
      console.log(`[video-worker] ${job.id}: AES-128 encryption registered`)
    }

    const result = {
      masterKey: `${slotBase(job.course_id, job.lesson_slot)}/hls/master.m3u8`,
      posterKey: `${slotBase(job.course_id, job.lesson_slot)}/thumbnails/poster.jpg`,
      posterUrl: null,
      durationSeconds: info.durationSeconds,
      encrypted: Boolean(enc),
      renditions: renditions.map((r) => ({ height: r.height, bitrateKbps: r.bitrateKbps })),
    }
    await finalizeAsset(job.asset_id, result)
    await completeJob(job.id, result)
    console.log(`[video-worker] job ${job.id}: DONE`)
  } catch (err) {
    console.error(`[video-worker] job ${job.id} FAILED:`, err?.message || err)
    await failJob(job.id, err?.message || String(err))
  } finally {
    await rm(jobDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function main() {
  await mkdir(env.workDir, { recursive: true })
  console.log(`[video-worker] started. work dir=${env.workDir} ffmpeg=${env.ffmpegPath}`)

  let idleLogged = false
  for (;;) {
    let job = null
    try {
      job = await claimNextJob()
    } catch (err) {
      console.error('[video-worker] claim error:', err?.message || err)
      await sleep(env.pollIntervalMs)
      continue
    }

    if (!job) {
      if (!idleLogged) {
        console.log('[video-worker] idle, waiting for jobs…')
        idleLogged = true
      }
      await sleep(env.pollIntervalMs)
      continue
    }

    idleLogged = false
    await processJob(job)
  }
}

main().catch((err) => {
  console.error('[video-worker] fatal:', err)
  process.exit(1)
})
