import type {
  PlaybackAdapter,
  PlaybackAdapterInitOptions,
} from '@/lib/playback/adapter-interface'
import type {
  PlaybackAudioTrack,
  PlaybackEngineState,
  PlaybackQuality,
  PlaybackSubtitleTrack,
} from '@/types/video-player'

export class Html5Mp4Adapter implements PlaybackAdapter {
  readonly engineType = 'html5' as const
  private video: HTMLVideoElement | null = null
  private buffering = false
  private opts: PlaybackAdapterInitOptions | null = null

  async initialize(options: PlaybackAdapterInitOptions): Promise<void> {
    this.opts = options
    this.video = options.videoElement
    if (options.poster) this.video.poster = options.poster
    if (!options.streamUrl) throw new Error('streamUrl required')
    this.video.src = options.streamUrl
    this.attachListeners()
    await this.video.load()
    this.opts.onStateChange?.('ready')
  }

  private attachListeners() {
    if (!this.video || !this.opts) return
    const { onTimeUpdate, onBufferChange, onEnded, onError, onStateChange } = this.opts

    this.video.addEventListener('timeupdate', () => {
      onTimeUpdate?.(this.getCurrentTime(), this.getDuration())
    })
    this.video.addEventListener('waiting', () => {
      this.buffering = true
      onBufferChange?.(true)
      onStateChange?.('buffering')
    })
    this.video.addEventListener('playing', () => {
      this.buffering = false
      onBufferChange?.(false)
      onStateChange?.('playing')
    })
    this.video.addEventListener('pause', () => onStateChange?.('paused'))
    this.video.addEventListener('ended', () => {
      onStateChange?.('ended')
      onEnded?.()
    })
    this.video.addEventListener('error', () => {
      onError?.(new Error('Playback failed'))
      onStateChange?.('error')
    })
  }

  async play(): Promise<void> {
    await this.video?.play()
  }

  pause(): void {
    this.video?.pause()
  }

  seek(seconds: number): void {
    if (this.video) this.video.currentTime = seconds
  }

  getDuration(): number {
    return this.video?.duration ?? 0
  }

  getCurrentTime(): number {
    return this.video?.currentTime ?? 0
  }

  setVolume(level: number): void {
    if (this.video) this.video.volume = Math.max(0, Math.min(1, level))
  }

  getVolume(): number {
    return this.video?.volume ?? 1
  }

  setMuted(muted: boolean): void {
    if (this.video) this.video.muted = muted
  }

  isMuted(): boolean {
    return this.video?.muted ?? false
  }

  setPlaybackRate(rate: number): void {
    if (this.video) this.video.playbackRate = rate
  }

  getPlaybackRate(): number {
    return this.video?.playbackRate ?? 1
  }

  setQuality(): void {
    /* single stream — no-op */
  }

  getAvailableQualities(): PlaybackQuality[] {
    return []
  }

  getAvailableSubtitles(): PlaybackSubtitleTrack[] {
    if (!this.video) return []
    return Array.from(this.video.textTracks).map((track, index) => ({
      id: String(index),
      label: track.label || track.language || `Track ${index + 1}`,
      language: track.language,
    }))
  }

  getAvailableAudioTracks(): PlaybackAudioTrack[] {
    return []
  }

  setSubtitleTrack(trackId: string | null): void {
    if (!this.video) return
    Array.from(this.video.textTracks).forEach((track, index) => {
      track.mode = trackId === String(index) ? 'showing' : 'hidden'
    })
  }

  async enterFullscreen(container: HTMLElement): Promise<void> {
    await container.requestFullscreen()
  }

  async exitFullscreen(): Promise<void> {
    if (document.fullscreenElement) await document.exitFullscreen()
  }

  isLive(): boolean {
    return false
  }

  isBuffering(): boolean {
    return this.buffering
  }

  dispose(): void {
    if (this.video) {
      this.video.pause()
      this.video.removeAttribute('src')
      this.video.load()
    }
    this.video = null
    this.opts = null
  }
}

function uniqueHeightsDescending(heights: number[]): number[] {
  return [...new Set(heights.filter((h) => h > 0))].sort((a, b) => b - a)
}

export class HlsPlaybackAdapter implements PlaybackAdapter {
  readonly engineType = 'hls' as const
  private video: HTMLVideoElement | null = null
  private hls: InstanceType<Awaited<typeof import('hls.js')>['default']> | null = null
  private qualities: PlaybackQuality[] = []
  private buffering = false
  private opts: PlaybackAdapterInitOptions | null = null

  async initialize(options: PlaybackAdapterInitOptions): Promise<void> {
    this.opts = options
    this.video = options.videoElement
    if (options.poster) this.video.poster = options.poster
    if (!options.hlsUrl) throw new Error('hlsUrl required')

    const { default: Hls } = await import('hls.js')

    if (Hls.isSupported()) {
      this.hls = new Hls({
        xhrSetup: (xhr) => {
          if (options.withCredentials) xhr.withCredentials = true
        },
      })
      this.hls.loadSource(options.hlsUrl)
      this.hls.attachMedia(this.video)

      await new Promise<void>((resolve, reject) => {
        if (!this.hls) return reject(new Error('HLS init failed'))
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const heights = uniqueHeightsDescending(
            this.hls!.levels.map((level) => level.height)
          )
          this.qualities = heights.map((height) => ({
            id: String(height),
            label: `${height}p`,
            height,
          }))
          resolve()
        })
        this.hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (options.mp4FallbackUrl) {
              this.fallbackToMp4(options.mp4FallbackUrl)
              resolve()
            } else {
              reject(new Error('HLS fatal error'))
            }
          }
        })
      })
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = options.hlsUrl
      await this.video.load()
    } else if (options.mp4FallbackUrl) {
      this.video.src = options.mp4FallbackUrl
      await this.video.load()
    } else {
      throw new Error('HLS not supported')
    }

    this.attachListeners()
    this.opts.onStateChange?.('ready')
  }

  private fallbackToMp4(url: string) {
    this.hls?.destroy()
    this.hls = null
    if (this.video) {
      this.video.src = url
      void this.video.load()
    }
    this.qualities = []
  }

  private attachListeners() {
    if (!this.video || !this.opts) return
    const { onTimeUpdate, onBufferChange, onEnded, onError, onStateChange } = this.opts

    this.video.addEventListener('timeupdate', () => {
      onTimeUpdate?.(this.getCurrentTime(), this.getDuration())
    })
    this.video.addEventListener('waiting', () => {
      this.buffering = true
      onBufferChange?.(true)
      onStateChange?.('buffering')
    })
    this.video.addEventListener('playing', () => {
      this.buffering = false
      onBufferChange?.(false)
      onStateChange?.('playing')
    })
    this.video.addEventListener('pause', () => onStateChange?.('paused'))
    this.video.addEventListener('ended', () => {
      onStateChange?.('ended')
      onEnded?.()
    })
    this.video.addEventListener('error', () => {
      onError?.(new Error('Playback failed'))
      onStateChange?.('error')
    })
  }

  async play(): Promise<void> {
    await this.video?.play()
  }

  pause(): void {
    this.video?.pause()
  }

  seek(seconds: number): void {
    if (this.video) this.video.currentTime = seconds
  }

  getDuration(): number {
    return this.video?.duration ?? 0
  }

  getCurrentTime(): number {
    return this.video?.currentTime ?? 0
  }

  setVolume(level: number): void {
    if (this.video) this.video.volume = Math.max(0, Math.min(1, level))
  }

  getVolume(): number {
    return this.video?.volume ?? 1
  }

  setMuted(muted: boolean): void {
    if (this.video) this.video.muted = muted
  }

  isMuted(): boolean {
    return this.video?.muted ?? false
  }

  setPlaybackRate(rate: number): void {
    if (this.video) this.video.playbackRate = rate
  }

  getPlaybackRate(): number {
    return this.video?.playbackRate ?? 1
  }

  setQuality(qualityId: string | 'auto'): void {
    if (!this.hls) return
    if (qualityId === 'auto') {
      this.hls.currentLevel = -1
      return
    }
    const height = Number(qualityId)
    const index = this.hls.levels.findIndex((level) => level.height === height)
    if (index >= 0) this.hls.currentLevel = index
  }

  getAvailableQualities(): PlaybackQuality[] {
    return this.qualities
  }

  getAvailableSubtitles(): PlaybackSubtitleTrack[] {
    return []
  }

  getAvailableAudioTracks(): PlaybackAudioTrack[] {
    return []
  }

  setSubtitleTrack(): void {
    /* HLS subtitles via text tracks — extend when manifest exposes them */
  }

  async enterFullscreen(container: HTMLElement): Promise<void> {
    await container.requestFullscreen()
  }

  async exitFullscreen(): Promise<void> {
    if (document.fullscreenElement) await document.exitFullscreen()
  }

  isLive(): boolean {
    return false
  }

  isBuffering(): boolean {
    return this.buffering
  }

  dispose(): void {
    this.hls?.destroy()
    this.hls = null
    if (this.video) {
      this.video.pause()
      this.video.removeAttribute('src')
      this.video.load()
    }
    this.video = null
    this.opts = null
  }
}

/** Generic embed bridge — uses postMessage protocol without provider SDK imports. */
export class EmbedPlaybackAdapter implements PlaybackAdapter {
  readonly engineType = 'embed' as const
  private iframe: HTMLIFrameElement | null = null
  private duration = 0
  private currentTime = 0
  private playing = false
  private buffering = false
  private opts: PlaybackAdapterInitOptions | null = null

  async initialize(options: PlaybackAdapterInitOptions): Promise<void> {
    this.opts = options
    if (!options.embedUrl) throw new Error('embedUrl required')

    this.iframe = document.createElement('iframe')
    this.iframe.src = options.embedUrl
    this.iframe.className = 'absolute inset-0 h-full w-full border-0'
    this.iframe.allow = 'autoplay; fullscreen; picture-in-picture'
    this.iframe.setAttribute('allowfullscreen', 'true')

    const container = options.videoElement.parentElement
    if (!container) throw new Error('Missing embed container')
    options.videoElement.style.display = 'none'
    container.appendChild(this.iframe)

    window.addEventListener('message', this.handleMessage)
    this.opts.onStateChange?.('ready')
  }

  private handleMessage = (event: MessageEvent) => {
    if (typeof event.data !== 'string') return
    try {
      const data = JSON.parse(event.data) as {
        event?: string
        data?: { seconds?: number; duration?: number }
      }
      if (data.event === 'ready') {
        this.duration = data.data?.duration ?? 0
      }
      if (data.event === 'timeupdate' && data.data?.seconds != null) {
        this.currentTime = data.data.seconds
        this.opts?.onTimeUpdate?.(this.currentTime, this.duration)
      }
      if (data.event === 'play') {
        this.playing = true
        this.opts?.onStateChange?.('playing')
      }
      if (data.event === 'pause') {
        this.playing = false
        this.opts?.onStateChange?.('paused')
      }
      if (data.event === 'ended') {
        this.opts?.onStateChange?.('ended')
        this.opts?.onEnded?.()
      }
    } catch {
      /* ignore non-JSON messages */
    }
  }

  private post(method: string, value?: number) {
    this.iframe?.contentWindow?.postMessage(
      JSON.stringify(value != null ? { method, value } : { method }),
      '*'
    )
  }

  async play(): Promise<void> {
    this.post('play')
    this.playing = true
  }

  pause(): void {
    this.post('pause')
    this.playing = false
  }

  seek(seconds: number): void {
    this.post('setCurrentTime', seconds)
    this.currentTime = seconds
  }

  getDuration(): number {
    return this.duration
  }

  getCurrentTime(): number {
    return this.currentTime
  }

  setVolume(level: number): void {
    this.post('setVolume', level)
  }

  getVolume(): number {
    return 1
  }

  setMuted(muted: boolean): void {
    this.post('setMuted', muted ? 1 : 0)
  }

  isMuted(): boolean {
    return false
  }

  setPlaybackRate(rate: number): void {
    this.post('setPlaybackRate', rate)
  }

  getPlaybackRate(): number {
    return 1
  }

  setQuality(): void {}
  getAvailableQualities(): PlaybackQuality[] {
    return []
  }

  isLive(): boolean {
    return false
  }

  isBuffering(): boolean {
    return this.buffering
  }

  getAvailableSubtitles(): PlaybackSubtitleTrack[] {
    return []
  }

  getAvailableAudioTracks(): PlaybackAudioTrack[] {
    return []
  }

  setSubtitleTrack(): void {}

  async enterFullscreen(container: HTMLElement): Promise<void> {
    await container.requestFullscreen()
  }

  async exitFullscreen(): Promise<void> {
    if (document.fullscreenElement) await document.exitFullscreen()
  }

  dispose(): void {
    window.removeEventListener('message', this.handleMessage)
    this.iframe?.remove()
    this.iframe = null
    this.opts = null
  }
}

export function createPlaybackAdapter(
  engine: 'html5' | 'hls' | 'embed'
): PlaybackAdapter {
  switch (engine) {
    case 'hls':
      return new HlsPlaybackAdapter()
    case 'embed':
      return new EmbedPlaybackAdapter()
    default:
      return new Html5Mp4Adapter()
  }
}
