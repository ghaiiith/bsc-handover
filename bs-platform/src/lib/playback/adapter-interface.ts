import type {
  PlaybackAudioTrack,
  PlaybackEngineState,
  PlaybackQuality,
  PlaybackSubtitleTrack,
} from '@/types/video-player'

export interface PlaybackAdapterInitOptions {
  videoElement: HTMLVideoElement
  streamUrl?: string
  hlsUrl?: string
  mp4FallbackUrl?: string
  embedUrl?: string
  poster?: string | null
  withCredentials?: boolean
  onStateChange?: (state: PlaybackEngineState) => void
  onError?: (error: Error) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onBufferChange?: (buffering: boolean) => void
  onEnded?: () => void
}

/** Provider-agnostic playback adapter contract. */
export interface PlaybackAdapter {
  readonly engineType: 'html5' | 'hls' | 'embed'
  initialize(options: PlaybackAdapterInitOptions): Promise<void>
  play(): Promise<void>
  pause(): void
  seek(seconds: number): void
  getDuration(): number
  getCurrentTime(): number
  setVolume(level: number): void
  getVolume(): number
  setMuted(muted: boolean): void
  isMuted(): boolean
  setPlaybackRate(rate: number): void
  getPlaybackRate(): number
  setQuality(qualityId: string | 'auto'): void
  getAvailableQualities(): PlaybackQuality[]
  getAvailableSubtitles(): PlaybackSubtitleTrack[]
  getAvailableAudioTracks(): PlaybackAudioTrack[]
  setSubtitleTrack(trackId: string | null): void
  enterFullscreen(container: HTMLElement): Promise<void>
  exitFullscreen(): Promise<void>
  isLive(): boolean
  isBuffering(): boolean
  dispose(): void
}
