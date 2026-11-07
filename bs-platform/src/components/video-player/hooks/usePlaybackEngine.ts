'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaybackAdapter } from '@/lib/playback/adapter-interface'
import { createPlaybackAdapter } from '@/lib/playback/adapters'
import { mapNativeError } from '@/lib/playback/errors'
import type {
  PlatformPlaybackErrorCode,
  PlaybackEngineState,
  ResolvedPlaybackConfig,
} from '@/types/video-player'

interface UsePlaybackEngineOptions {
  config: ResolvedPlaybackConfig | null
  onProgress?: (percent: number) => void
  onEnded?: () => void
  onError?: (code: PlatformPlaybackErrorCode) => void
}

export function usePlaybackEngine({
  config,
  onProgress,
  onEnded,
  onError,
}: UsePlaybackEngineOptions) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const adapterRef = useRef<PlaybackAdapter | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [engineState, setEngineState] = useState<PlaybackEngineState>('idle')
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const onProgressRef = useRef(onProgress)
  const onEndedRef = useRef(onEnded)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onProgressRef.current = onProgress
    onEndedRef.current = onEnded
    onErrorRef.current = onError
  }, [onProgress, onEnded, onError])

  useEffect(() => {
    if (!config || !videoRef.current) return

    let cancelled = false
    setEngineState('loading')

    const adapter = createPlaybackAdapter(config.engine)
    adapterRef.current = adapter

    void adapter
      .initialize({
        videoElement: videoRef.current,
        streamUrl: config.streamUrl,
        hlsUrl: config.hlsUrl,
        mp4FallbackUrl: config.mp4FallbackUrl,
        embedUrl: config.embedUrl,
        poster: config.poster,
        withCredentials: Boolean(config.sessionEndpoint),
        onStateChange: (state) => {
          if (!cancelled) setEngineState(state)
        },
        onTimeUpdate: (current, duration) => {
          if (duration > 0) {
            onProgressRef.current?.((current / duration) * 100)
          }
          const video = videoRef.current
          if (video && video.buffered.length > 0 && duration > 0) {
            const end = video.buffered.end(video.buffered.length - 1)
            setBufferedPercent((end / duration) * 100)
          }
        },
        onBufferChange: (buffering) => {
          if (!cancelled && buffering) setEngineState('buffering')
        },
        onEnded: () => onEndedRef.current?.(),
        onError: (error) => onErrorRef.current?.(mapNativeError(error)),
      })
      .catch((error) => {
        if (!cancelled) {
          setEngineState('error')
          onErrorRef.current?.(mapNativeError(error))
        }
      })

    return () => {
      cancelled = true
      adapter.dispose()
      adapterRef.current = null
    }
  }, [config])

  const play = useCallback(async () => {
    await adapterRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    adapterRef.current?.pause()
  }, [])

  const togglePlay = useCallback(async () => {
    if (engineState === 'playing') {
      pause()
    } else {
      await play()
    }
  }, [engineState, pause, play])

  const seek = useCallback((seconds: number) => {
    adapterRef.current?.seek(seconds)
  }, [])

  const seekRelative = useCallback((delta: number) => {
    const adapter = adapterRef.current
    if (!adapter) return
    adapter.seek(Math.max(0, adapter.getCurrentTime() + delta))
  }, [])

  const setVolume = useCallback((level: number) => {
    adapterRef.current?.setVolume(level)
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    adapterRef.current?.setMuted(muted)
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    adapterRef.current?.setPlaybackRate(rate)
  }, [])

  const setQuality = useCallback((qualityId: string | 'auto') => {
    adapterRef.current?.setQuality(qualityId)
  }, [])

  const enterFullscreen = useCallback(async () => {
    if (containerRef.current) {
      await adapterRef.current?.enterFullscreen(containerRef.current)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    await adapterRef.current?.exitFullscreen()
  }, [])

  const getAdapter = useCallback(() => adapterRef.current, [])

  return {
    videoRef,
    containerRef,
    engineState,
    bufferedPercent,
    play,
    pause,
    togglePlay,
    seek,
    seekRelative,
    setVolume,
    setMuted,
    setPlaybackRate,
    setQuality,
    enterFullscreen,
    exitFullscreen,
    getAdapter,
  }
}
