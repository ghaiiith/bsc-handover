// FFmpeg transcode: single-pass adaptive HLS ladder (decode once, scale to
// every rendition) + a poster frame. Software x264 (no GPU on this box), tuned
// for speed with the `veryfast` preset.

import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { env } from './env.mjs'

// Standard bitrate ladder. Only tiers whose height <= source height are used.
const LADDER = [
  { height: 1080, bitrateKbps: 5000, maxrateKbps: 5350, bufKbps: 7500, audioKbps: 128 },
  { height: 720, bitrateKbps: 2800, maxrateKbps: 2996, bufKbps: 4200, audioKbps: 128 },
  { height: 480, bitrateKbps: 1400, maxrateKbps: 1498, bufKbps: 2100, audioKbps: 96 },
  { height: 360, bitrateKbps: 800, maxrateKbps: 856, bufKbps: 1200, audioKbps: 96 },
]

function run(bin, args, { onStdout } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args)
    let stderr = ''
    proc.stdout.on('data', (d) => onStdout?.(d.toString()))
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
      if (stderr.length > 20000) stderr = stderr.slice(-20000)
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${path.basename(bin)} exited ${code}: ${stderr.slice(-1500)}`))
    })
  })
}

export async function probe(sourcePath) {
  let out = ''
  await run(
    env.ffprobePath,
    [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      sourcePath,
    ],
    { onStdout: (s) => (out += s) }
  )
  const data = JSON.parse(out)
  const video = (data.streams || []).find((s) => s.codec_type === 'video')
  const audio = (data.streams || []).find((s) => s.codec_type === 'audio')
  if (!video) throw new Error('no video stream found')
  return {
    durationSeconds: Math.round(Number(data.format?.duration) || 0),
    width: Number(video.width) || 0,
    height: Number(video.height) || 0,
    hasAudio: Boolean(audio),
  }
}

/** Pick the ladder subset that fits the source (never upscale). */
export function planRenditions(sourceHeight) {
  const fit = LADDER.filter((t) => t.height <= sourceHeight)
  if (fit.length === 0) {
    // Source shorter than the smallest tier: single rendition at source height
    // (rounded to an even number for x264).
    const h = Math.max(2, sourceHeight - (sourceHeight % 2))
    return [{ height: h, bitrateKbps: 800, maxrateKbps: 856, bufKbps: 1200, audioKbps: 96 }]
  }
  return fit
}

/**
 * Transcode `sourcePath` into `outDir` as an HLS ladder.
 * Emits master.m3u8 + v{i}/playlist.m3u8 + v{i}/segment_*.ts.
 * `onProgress(fraction 0..1)` fires as encoding advances.
 */
export async function transcodeToHls(sourcePath, outDir, renditions, hasAudio, durationSeconds, onProgress, keyInfoPath = null) {
  await mkdir(outDir, { recursive: true })
  for (let i = 0; i < renditions.length; i++) {
    await mkdir(path.join(outDir, `v${i}`), { recursive: true })
  }

  const n = renditions.length
  // Optional burned-in watermark: a faint brand mark that slowly drifts around
  // the frame centre. Centre-anchored so it can't be cropped away, and burned
  // into pixels so it survives screenshots and DOM removal. Expressions avoid
  // commas so they need no escaping inside filter_complex.
  const wm =
    env.burnWatermark && env.watermarkText
      ? `,drawtext=fontfile=${env.watermarkFont}:text=${env.watermarkText}` +
        `:fontsize=h/24:fontcolor=white@0.14:shadowcolor=black@0.25:shadowx=1:shadowy=1` +
        `:x=(w-text_w)/2+(w/6)*sin(t/5):y=(h-text_h)/2+(h/6)*sin(t/8)`
      : ''

  // filter_complex: split the decoded video into N branches, scale (+watermark) each.
  const splitLabels = renditions.map((_, i) => `[t${i}]`).join('')
  const scaleChains = renditions
    .map((r, i) => `[t${i}]scale=w=-2:h=${r.height}${wm}[v${i}]`)
    .join(';')
  const filter = `[0:v]split=${n}${splitLabels};${scaleChains}`

  const args = ['-y', '-nostats', '-progress', 'pipe:1', '-i', sourcePath, '-filter_complex', filter]

  renditions.forEach((r, i) => {
    args.push('-map', `[v${i}]`)
    if (hasAudio) args.push('-map', '0:a:0')
  })

  renditions.forEach((r, i) => {
    args.push(
      `-c:v:${i}`, 'libx264',
      `-b:v:${i}`, `${r.bitrateKbps}k`,
      `-maxrate:v:${i}`, `${r.maxrateKbps}k`,
      `-bufsize:v:${i}`, `${r.bufKbps}k`,
    )
    if (hasAudio) {
      args.push(`-c:a:${i}`, 'aac', `-b:a:${i}`, `${r.audioKbps}k`, `-ac:a:${i}`, '2')
    }
  })

  const varMap = renditions
    .map((_, i) => (hasAudio ? `v:${i},a:${i}` : `v:${i}`))
    .join(' ')

  args.push(
    '-preset', 'veryfast',
    '-profile:v', 'main',
    '-sc_threshold', '0',
    '-g', '48',
    '-keyint_min', '48',
    '-f', 'hls',
  )
  // AES-128 encrypt every segment. The proxy rewrites the #EXT-X-KEY URI to the
  // authenticated key endpoint; the key file itself is never uploaded.
  if (keyInfoPath) {
    args.push('-hls_key_info_file', keyInfoPath)
  }
  args.push(
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_flags', 'independent_segments',
    '-hls_segment_type', 'mpegts',
    '-hls_segment_filename', path.join(outDir, 'v%v', 'segment_%03d.ts'),
    '-master_pl_name', 'master.m3u8',
    '-var_stream_map', varMap,
    path.join(outDir, 'v%v', 'playlist.m3u8'),
  )

  await run(env.ffmpegPath, args, {
    onStdout: (chunk) => {
      // parsed from -progress below
      // -progress pipe:1 emits `out_time_us=<microseconds>` lines to stdout.
      const matches = chunk.matchAll(/out_time_us=(\d+)/g)
      let last
      for (const m of matches) last = m
      if (last && durationSeconds > 0) {
        const secs = Number(last[1]) / 1_000_000
        onProgress?.(Math.min(1, secs / durationSeconds))
      }
    },
  })
}

export async function makePoster(sourcePath, posterPath, durationSeconds) {
  const at = Math.max(1, Math.floor(durationSeconds * 0.1))
  await run(env.ffmpegPath, [
    '-y',
    '-ss', String(at),
    '-i', sourcePath,
    '-frames:v', '1',
    '-vf', 'scale=-2:720',
    '-q:v', '3',
    posterPath,
  ])
}
