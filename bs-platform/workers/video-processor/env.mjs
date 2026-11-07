// Environment loading + validation for the standalone video-processing worker.
// Runs on the app server (systemd), reading the same .env.local as the app.

function req(name) {
  const v = process.env[name]
  if (!v || !v.trim()) {
    console.error(`[video-worker] missing required env var: ${name}`)
    process.exit(1)
  }
  return v.trim()
}

export const env = {
  supabaseUrl: req('NEXT_PUBLIC_SUPABASE_URL'),
  serviceRoleKey: req('SUPABASE_SERVICE_ROLE_KEY'),

  r2: {
    accountId: req('R2_ACCOUNT_ID'),
    accessKeyId: req('R2_ACCESS_KEY_ID'),
    secretAccessKey: req('R2_SECRET_ACCESS_KEY'),
    bucket: req('R2_BUCKET_NAME'),
    endpoint:
      (process.env.R2_ENDPOINT && process.env.R2_ENDPOINT.trim()) ||
      `https://${req('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  },

  ffmpegPath: process.env.FFMPEG_PATH?.trim() || '/usr/local/bin/ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH?.trim() || '/usr/local/bin/ffprobe',
  workDir: process.env.VIDEO_WORK_DIR?.trim() || '/tmp/bs-video-jobs',
  pollIntervalMs: Number(process.env.VIDEO_POLL_INTERVAL_MS) || 5000,
  // Encrypt HLS segments with AES-128 by default (disable with VIDEO_ENCRYPT_HLS=false).
  encryptHls: process.env.VIDEO_ENCRYPT_HLS !== 'false',
  // Burn a faint drifting brand watermark into the pixels (survives screenshots
  // and DOM removal). Needs a drawtext-capable ffmpeg (BtbN build).
  burnWatermark: process.env.VIDEO_BURN_WATERMARK !== 'false',
  watermarkText: (process.env.VIDEO_WATERMARK_TEXT || 'Business Skills · bs-platform.com')
    // strip chars that would break the drawtext filter expression
    .replace(/[:,'\\%\n]/g, ' ')
    .slice(0, 60),
  watermarkFont:
    process.env.VIDEO_WATERMARK_FONT?.trim() ||
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
}
