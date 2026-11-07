'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  buildSessionEndpoint,
  flushPlaybackAnalytics,
  mapFetchErrorToPlatformError,
  resolvePlaybackConfig,
} from '@/lib/playback'
import { enrichPlaybackConfigCapabilities } from '@/lib/playback/player-capabilities'
import {
  createAnalyticsState,
  trackPlayerEvent,
} from '@/lib/playback/player-analytics'
import {
  mapEngineToUIState,
  PlayerUIStateMachine,
} from '@/lib/playback/player-state-machine'
import { createPlayerNotesBus } from '@/lib/playback/player-notes'
import { createSubtitleManager } from '@/lib/playback/subtitles'
import {
  applyPlayerPreferences,
  loadPlayerPreferences,
} from '@/lib/playback/preferences'
import {
  buildBookmarksEndpoint,
  buildProgressEndpoint,
  createBookmark,
  fetchBookmarks,
  fetchWatchProgress,
  saveWatchProgress,
  shouldOfferResume,
} from '@/lib/playback/watch-progress'
import { useLessonPlayerShell } from '@/components/courses/LessonPlayerShell'
import VideoWatermarkOverlay from '@/components/courses/VideoWatermarkOverlay'
import PlayerHeader from '@/components/video-player/PlayerHeader'
import PlayerControls from '@/components/video-player/PlayerControls'
import PlayerSettingsPanel from '@/components/video-player/PlayerSettingsPanel'
import PlayerEndScreen from '@/components/video-player/PlayerEndScreen'
import PlayerDebugOverlay from '@/components/video-player/PlayerDebugOverlay'
import PlayerBufferingOverlay from '@/components/video-player/PlayerBufferingOverlay'
import PlayerResumePrompt from '@/components/video-player/PlayerResumePrompt'
import { PlayerErrorState, PlayerLoadingState } from '@/components/video-player/PlayerStates'
import { usePlaybackEngine } from '@/components/video-player/hooks/usePlaybackEngine'
import { usePlayerKeyboard } from '@/components/video-player/hooks/usePlayerKeyboard'
import { usePlaybackSession } from '@/components/video-player/hooks/usePlaybackSession'
import { useControlVisibility } from '@/components/video-player/hooks/useControlVisibility'
import { usePlayerInteractions } from '@/components/video-player/hooks/usePlayerInteractions'
import SessionExpiredOverlay from '@/components/video-player/SessionExpiredOverlay'
import SessionOfflineOverlay from '@/components/video-player/SessionOfflineOverlay'
import type { PlaybackActivityState } from '@/lib/playback/session-lifecycle'
import type { SecurePlaybackResponse } from '@/types/content-protection'
import type {
  LessonPlaybackMetadata,
  PlatformPlaybackErrorCode,
  PlayerBookmark,
  PlayerPreferences,
  ResolvedPlaybackConfig,
} from '@/types/video-player'

export interface BsPlatformVideoPlayerProps {
  endpoint: string
  poster?: string | null
  className?: string
  locale?: string
  metadata?: LessonPlaybackMetadata
  isAdmin?: boolean
  analyticsEndpoint?: string
  courseId?: string
  lessonId?: string
  onProgress?: (percent: number) => void
  onPreviousLesson?: () => void
  onNextLesson?: () => void
  onBackToCourse?: () => void
  onMarkComplete?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

type LoadState = 'loading' | 'ready' | 'error'

export default function BsPlatformVideoPlayer({
  endpoint,
  poster,
  className,
  locale,
  metadata: metadataProp,
  isAdmin = false,
  analyticsEndpoint,
  courseId,
  lessonId,
  onProgress,
  onPreviousLesson,
  onNextLesson,
  onBackToCourse,
  onMarkComplete,
  hasPrevious = false,
  hasNext = false,
}: BsPlatformVideoPlayerProps) {
  const t = useTranslations('video_player')
  const currentLocale = useLocale()
  const activeLocale = locale ?? currentLocale
  const { setFocusMode } = useLessonPlayerShell()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorCode, setErrorCode] = useState<PlatformPlaybackErrorCode>('unavailable')
  const [config, setConfig] = useState<ResolvedPlaybackConfig | null>(null)
  const [preferences, setPreferences] = useState<PlayerPreferences>(() =>
    loadPlayerPreferences()
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [showEndScreen, setShowEndScreen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bookmarks, setBookmarks] = useState<PlayerBookmark[]>([])
  const [resumePosition, setResumePosition] = useState<number | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [uiStateLabel, setUiStateLabel] = useState('Idle')
  const [, startTransition] = useTransition()

  const uiMachineRef = useRef(new PlayerUIStateMachine())
  const analyticsRef = useRef(createAnalyticsState())
  const notesBusRef = useRef(createPlayerNotesBus())
  const subtitleManagerRef = useRef(createSubtitleManager())
  const prevEngineStateRef = useRef<string>('idle')
  const resumeAppliedRef = useRef(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const metadata = metadataProp ?? config?.metadata

  const fetchPlayback = useCallback(async () => {
    setLoadState('loading')
    setShowEndScreen(false)
    setErrorCode('unavailable')
    uiMachineRef.current.forceTransition('Loading')
    setUiStateLabel('Loading')

    try {
      const res = await fetch(endpoint, { cache: 'no-store', credentials: 'include' })
      if (!res.ok) {
        setErrorCode(mapFetchErrorToPlatformError(undefined, res.status))
        setLoadState('error')
        return
      }
      const data = (await res.json()) as SecurePlaybackResponse
      const resolved = resolvePlaybackConfig(data, {
        poster,
        sessionEndpoint: data.session ? buildSessionEndpoint(endpoint) : undefined,
        isAdmin,
      })
      if ('error' in resolved) {
        setErrorCode(resolved.error)
        setLoadState('error')
        return
      }
      if (resolved.subtitles?.length) {
        subtitleManagerRef.current.loadTracks(resolved.subtitles)
      }
      setConfig(resolved)
      setLoadState('ready')
      uiMachineRef.current.forceTransition('Ready')
      setUiStateLabel('Ready')
      trackPlayerEvent(analyticsEndpoint, 'playback_started', { courseId, lessonId }, analyticsRef.current)
    } catch {
      setErrorCode('network_lost')
      setLoadState('error')
    }
  }, [endpoint, poster, isAdmin, analyticsEndpoint, courseId, lessonId])

  useEffect(() => {
    void fetchPlayback()
  }, [fetchPlayback, retryKey])

  useEffect(() => {
    setFocusMode(preferences.focusMode)
  }, [preferences.focusMode, setFocusMode])

  useEffect(() => {
    if (showEndScreen) {
      setSettingsOpen(false)
    }
  }, [showEndScreen])

  const handleProgress = useCallback(
    (percent: number) => onProgress?.(percent),
    [onProgress]
  )

  const handleEnded = useCallback(() => {
    setShowEndScreen(true)
    uiMachineRef.current.forceTransition('Completed')
    setUiStateLabel('Completed')
    trackPlayerEvent(
      analyticsEndpoint,
      'playback_completed',
      { courseId, lessonId, duration },
      analyticsRef.current
    )
  }, [analyticsEndpoint, courseId, lessonId, duration])

  const handleEngineError = useCallback(
    (code: PlatformPlaybackErrorCode) => {
      setErrorCode(code)
      setLoadState('error')
      uiMachineRef.current.forceTransition('Error')
      setUiStateLabel('Error')
      trackPlayerEvent(
        analyticsEndpoint,
        'playback_error',
        { courseId, lessonId, errorCode: code },
        analyticsRef.current
      )
    },
    [analyticsEndpoint, courseId, lessonId]
  )

  const engine = usePlaybackEngine({
    config: loadState === 'ready' ? config : null,
    onProgress: handleProgress,
    onEnded: handleEnded,
    onError: handleEngineError,
  })

  const engineRef = useRef(engine)
  useEffect(() => {
    engineRef.current = engine
  }, [engine])

  const sessionLifecycle = usePlaybackSession({
    sessionEndpoint: config?.sessionEndpoint,
    initialSession: config?.session,
    lessonId,
    courseId,
    analyticsEndpoint,
    enabled: loadState === 'ready' && Boolean(config?.sessionEndpoint),
    playbackState: (() => {
      const state = engine.engineState
      if (state === 'playing') return 'playing' as PlaybackActivityState
      if (state === 'paused') return 'paused' as PlaybackActivityState
      if (state === 'buffering') return 'buffering' as PlaybackActivityState
      return 'idle' as PlaybackActivityState
    })(),
    onPermanentExpiry: () => engineRef.current.pause(),
    onResumed: () => void engineRef.current.play(),
  })

  const registerSessionActivity = sessionLifecycle.registerActivity

  const qualities = useMemo(
    () => engine.getAdapter()?.getAvailableQualities() ?? [],
    [engine, loadState, config]
  )

  const enrichedConfig = useMemo(
    () => (config ? enrichPlaybackConfigCapabilities(config, qualities.length) : null),
    [config, qualities.length]
  )

  const capabilities = enrichedConfig?.capabilities

  useEffect(() => {
    if (loadState !== 'ready') return
    engine.setVolume(preferences.volume)
    engine.setMuted(preferences.muted)
    engine.setPlaybackRate(preferences.playbackRate)
    if (preferences.quality !== 'auto') {
      engine.setQuality(String(preferences.quality))
    }
  }, [loadState, preferences, engine])

  useEffect(() => {
    if (loadState !== 'ready' || !lessonId) return
    const progressEndpoint = buildProgressEndpoint(endpoint)
    const bookmarksEndpoint = buildBookmarksEndpoint(endpoint)

    void (async () => {
      const [progress, bookmarkList] = await Promise.all([
        capabilities?.supportsResume ? fetchWatchProgress(progressEndpoint) : null,
        capabilities?.supportsBookmarks ? fetchBookmarks(bookmarksEndpoint) : [],
      ])
      setBookmarks(bookmarkList)
      if (progress && shouldOfferResume(progress, duration)) {
        setResumePosition(progress.watchPositionSeconds)
        setShowResumePrompt(true)
        trackPlayerEvent(analyticsEndpoint, 'resume_prompt_shown', { courseId, lessonId })
      }
    })()
  }, [loadState, lessonId, endpoint, duration, capabilities, analyticsEndpoint, courseId])

  useEffect(() => {
    tickRef.current = setInterval(() => {
      const adapter = engine.getAdapter()
      if (!adapter) return
      const time = adapter.getCurrentTime()
      const dur = adapter.getDuration()
      setCurrentTime(time)
      setDuration(dur)
    }, 500)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [engine, loadState])

  useEffect(() => {
    if (loadState !== 'ready' || !lessonId || !capabilities?.supportsResume) return
    const progressEndpoint = buildProgressEndpoint(endpoint)
    const save = () => {
      if (duration <= 0) return
      void saveWatchProgress(progressEndpoint, {
        watchPositionSeconds: currentTime,
        completionPercent: (currentTime / duration) * 100,
        deviceInfo: navigator.userAgent,
      })
    }
    const interval = setInterval(save, 30_000)
    const onUnload = () => save()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', onUnload)
      save()
      if (analyticsEndpoint) flushPlaybackAnalytics(analyticsEndpoint)
    }
  }, [loadState, lessonId, currentTime, duration, endpoint, capabilities, analyticsEndpoint])

  useEffect(() => {
    const prev = prevEngineStateRef.current
    const next = engine.engineState
    if (prev !== next) {
      if (next === 'buffering') {
        trackPlayerEvent(analyticsEndpoint, 'buffer_start', { courseId, lessonId }, analyticsRef.current)
      } else if (prev === 'buffering') {
        trackPlayerEvent(analyticsEndpoint, 'buffer_end', { courseId, lessonId }, analyticsRef.current)
      }
      if (next === 'playing' && prev === 'paused') {
        trackPlayerEvent(analyticsEndpoint, 'playback_resumed', { courseId, lessonId }, analyticsRef.current)
      }
      if (next === 'paused' && prev === 'playing') {
        trackPlayerEvent(analyticsEndpoint, 'playback_paused', { courseId, lessonId }, analyticsRef.current)
      }
      const ui = mapEngineToUIState(next, {
        isFullscreen,
        isOffline: sessionLifecycle.isOffline,
        showEnd: showEndScreen,
      })
      uiMachineRef.current.forceTransition(ui)
      setUiStateLabel(ui)
      prevEngineStateRef.current = next
    }
  }, [
    engine.engineState,
    isFullscreen,
    sessionLifecycle.isOffline,
    showEndScreen,
    analyticsEndpoint,
    courseId,
    lessonId,
  ])

  const { controlsVisible, cursorHidden, showControls } = useControlVisibility({
    containerRef: engine.containerRef,
    enabled: loadState === 'ready',
  })

  const updatePreferences = useCallback((partial: Partial<PlayerPreferences>) => {
    startTransition(() => {
      const next = applyPlayerPreferences(partial)
      setPreferences(next)
    })
  }, [])

  const handleSeekPercent = useCallback(
    (percent: number) => {
      if (!duration) return
      const target = (percent / 100) * duration
      engine.seek(target)
      registerSessionActivity()
      trackPlayerEvent(
        analyticsEndpoint,
        'playback_seeked',
        { courseId, lessonId, currentTime: target },
        analyticsRef.current
      )
    },
    [engine, duration, analyticsEndpoint, courseId, lessonId, registerSessionActivity]
  )

  const handleVolumeChange = useCallback(
    (values: number[]) => {
      const level = values[0]
      engine.setVolume(level)
      updatePreferences({ volume: level, muted: level === 0 })
    },
    [engine, updatePreferences]
  )

  const handleToggleMute = useCallback(() => {
    const next = !preferences.muted
    engine.setMuted(next)
    updatePreferences({ muted: next })
  }, [engine, preferences.muted, updatePreferences])

  const handleToggleFullscreen = useCallback(async () => {
    registerSessionActivity()
    if (document.fullscreenElement) {
      await engine.exitFullscreen()
      setIsFullscreen(false)
      trackPlayerEvent(analyticsEndpoint, 'fullscreen_exit', { courseId, lessonId })
    } else {
      await engine.enterFullscreen()
      setIsFullscreen(true)
      trackPlayerEvent(analyticsEndpoint, 'fullscreen_enter', { courseId, lessonId })
    }
  }, [engine, registerSessionActivity, analyticsEndpoint, courseId, lessonId])

  const handlePictureInPicture = useCallback(async () => {
    registerSessionActivity()
    const video = engine.videoRef.current
    if (video && document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        trackPlayerEvent(analyticsEndpoint, 'pip_exit', { courseId, lessonId })
      } else {
        await video.requestPictureInPicture()
        trackPlayerEvent(analyticsEndpoint, 'pip_enter', { courseId, lessonId })
      }
    }
  }, [engine.videoRef, registerSessionActivity, analyticsEndpoint, courseId, lessonId])

  const handleTogglePlay = useCallback(() => {
    registerSessionActivity()
    void engine.togglePlay()
  }, [engine, registerSessionActivity])

  const handleSeekRelative = useCallback(
    (delta: number) => {
      engine.seekRelative(delta)
      registerSessionActivity()
      trackPlayerEvent(
        analyticsEndpoint,
        'playback_seeked',
        { courseId, lessonId },
        analyticsRef.current
      )
    },
    [engine, registerSessionActivity, analyticsEndpoint, courseId, lessonId]
  )

  const handleReplay = useCallback(() => {
    setShowEndScreen(false)
    engine.seek(0)
    void engine.play()
    trackPlayerEvent(analyticsEndpoint, 'playback_replayed', { courseId, lessonId })
  }, [engine, analyticsEndpoint, courseId, lessonId])

  const handleResumeFromPrompt = useCallback(() => {
    if (resumePosition != null) {
      engine.seek(resumePosition)
      void engine.play()
      trackPlayerEvent(analyticsEndpoint, 'resume_accepted', { courseId, lessonId })
    }
    setShowResumePrompt(false)
    resumeAppliedRef.current = true
  }, [engine, resumePosition, analyticsEndpoint, courseId, lessonId])

  const handleStartOver = useCallback(() => {
    engine.seek(0)
    setShowResumePrompt(false)
    resumeAppliedRef.current = true
    trackPlayerEvent(analyticsEndpoint, 'resume_declined', { courseId, lessonId })
  }, [engine, analyticsEndpoint, courseId, lessonId])

  const handleAddBookmark = useCallback(async () => {
    if (!capabilities?.supportsBookmarks) return
    const bookmark = await createBookmark(
      buildBookmarksEndpoint(endpoint),
      currentTime
    )
    if (bookmark) {
      setBookmarks((prev) => [...prev, bookmark].sort((a, b) => a.timestampSeconds - b.timestampSeconds))
      trackPlayerEvent(analyticsEndpoint, 'bookmark_added', { courseId, lessonId, currentTime })
      notesBusRef.current.emit({ lessonId: lessonId ?? '', timestampSeconds: currentTime })
    }
  }, [capabilities, endpoint, currentTime, analyticsEndpoint, courseId, lessonId])

  const handleQualityChange = useCallback(
    (quality: 'auto' | string) => {
      updatePreferences({
        quality: quality === 'auto' ? 'auto' : Number(quality),
        autoQuality: quality === 'auto',
      })
      engine.setQuality(quality === 'auto' ? 'auto' : String(quality))
      registerSessionActivity()
      trackPlayerEvent(analyticsEndpoint, 'quality_changed', {
        courseId,
        lessonId,
        quality: String(quality),
      })
    },
    [engine, updatePreferences, registerSessionActivity, analyticsEndpoint, courseId, lessonId]
  )

  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      updatePreferences({ playbackRate: rate })
      engine.setPlaybackRate(rate)
      registerSessionActivity()
      trackPlayerEvent(analyticsEndpoint, 'speed_changed', {
        courseId,
        lessonId,
        playbackRate: rate,
      })
    },
    [engine, updatePreferences, registerSessionActivity, analyticsEndpoint, courseId, lessonId]
  )

  const handleToggleSettings = useCallback(() => {
    registerSessionActivity()
    setSettingsOpen((open) => !open)
  }, [registerSessionActivity])

  const handleSeekToBookmark = useCallback(
    (timestampSeconds: number) => {
      engine.seek(timestampSeconds)
      registerSessionActivity()
      trackPlayerEvent(
        analyticsEndpoint,
        'playback_seeked',
        { courseId, lessonId, currentTime: timestampSeconds },
        analyticsRef.current
      )
    },
    [engine, registerSessionActivity, analyticsEndpoint, courseId, lessonId]
  )

  const { handleContainerClick, stopPropagation } = usePlayerInteractions({
    enabled: loadState === 'ready' && !showEndScreen && !settingsOpen,
    onSingleClick: handleTogglePlay,
    onDoubleClickLeft: () => handleSeekRelative(-10),
    onDoubleClickRight: () => handleSeekRelative(10),
    onDoubleClickCenter: () => void handleToggleFullscreen(),
  })

  const handleContainerClickWithSettings = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (settingsOpen) {
        setSettingsOpen(false)
        return
      }
      handleContainerClick(event)
    },
    [settingsOpen, handleContainerClick]
  )

  const handleTogglePlayWithSettings = useCallback(() => {
    if (settingsOpen) setSettingsOpen(false)
    handleTogglePlay()
  }, [settingsOpen, handleTogglePlay])

  usePlayerKeyboard({
    enabled: loadState === 'ready' && !showEndScreen,
    containerRef: engine.containerRef,
    isHovered,
    isFullscreen,
    settingsOpen,
    onCloseSettings: () => setSettingsOpen(false),
    onTogglePlay: () => {
      registerSessionActivity()
      handleTogglePlayWithSettings()
    },
    onSeekRelative: (delta) => {
      handleSeekRelative(delta)
    },
    onVolumeChange: (delta) => {
      const next = Math.max(0, Math.min(1, preferences.volume + delta))
      handleVolumeChange([next])
    },
    onToggleMute: handleToggleMute,
    onToggleFullscreen: () => void handleToggleFullscreen(),
    onToggleSettings: handleToggleSettings,
  })

  if (loadState === 'loading') {
    return <PlayerLoadingState poster={poster} className={className} />
  }

  if (loadState === 'error') {
    return (
      <PlayerErrorState
        errorCode={errorCode}
        onRetry={() => setRetryKey((k) => k + 1)}
        onRefresh={() => window.location.reload()}
        className={className}
      />
    )
  }

  const playing = engine.engineState === 'playing'
  const buffering = engine.engineState === 'buffering'

  return (
    <div
      ref={engine.containerRef}
      tabIndex={0}
      className={cn(
        'group relative aspect-video w-full overflow-hidden rounded-xl bg-black outline-none',
        cursorHidden && 'cursor-none',
        className
      )}
      onClick={handleContainerClickWithSettings}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={showControls}
      role="region"
      aria-label={t('player_region')}
    >
      {config?.watermark && capabilities?.supportsWatermark && (
        <VideoWatermarkOverlay
          config={config.watermark}
          displayName={config.watermarkContext?.displayName}
          userId={config.watermarkContext?.userId}
          lessonTitle={config.watermarkContext?.lessonTitle}
          courseTitle={config.watermarkContext?.courseTitle}
        />
      )}

      <video
        ref={engine.videoRef}
        className="bs-platform-video pointer-events-none h-full w-full object-contain"
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        controlsList="nodownload noremoteplayback"
        disableRemotePlayback
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        crossOrigin={config?.engine === 'hls' ? 'anonymous' : undefined}
      />

      <PlayerBufferingOverlay
        visible={buffering}
        isOnline={!sessionLifecycle.isOffline}
      />

      {showResumePrompt && resumePosition != null && !resumeAppliedRef.current && (
        <PlayerResumePrompt
          positionSeconds={resumePosition}
          onResume={handleResumeFromPrompt}
          onStartOver={handleStartOver}
        />
      )}

      <PlayerHeader
        metadata={metadata}
        currentTime={currentTime}
        duration={duration}
        visible={controlsVisible && !showEndScreen}
      />

      <PlayerControls
        visible={controlsVisible && !showEndScreen}
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        bufferedPercent={engine.bufferedPercent}
        volume={preferences.volume}
        muted={preferences.muted}
        showBookmarks={capabilities?.supportsBookmarks ?? false}
        supportsPiP={capabilities?.supportsPiP ?? false}
        isFullscreen={isFullscreen}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        chapters={config?.chapters}
        bookmarks={bookmarks}
        timelineEvents={config?.timelineEvents}
        seekPreview={config?.seekPreview}
        onTogglePlay={handleTogglePlayWithSettings}
        onSeek={handleSeekPercent}
        onSeekRelative={handleSeekRelative}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleSettings={handleToggleSettings}
        settingsOpen={settingsOpen}
        onToggleFullscreen={() => void handleToggleFullscreen()}
        onPictureInPicture={() => void handlePictureInPicture()}
        onAddBookmark={handleAddBookmark}
        onSeekToBookmark={handleSeekToBookmark}
        onPreviousLesson={onPreviousLesson}
        onNextLesson={onNextLesson}
        onStopPropagation={stopPropagation}
      />

      <PlayerSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isFullscreen={isFullscreen}
        preferences={preferences}
        qualities={qualities}
        hasNext={hasNext}
        onPreferencesChange={(partial) => {
          updatePreferences(partial)
          registerSessionActivity()
          if (partial.playbackRate != null) {
            engine.setPlaybackRate(partial.playbackRate)
            trackPlayerEvent(analyticsEndpoint, 'speed_changed', {
              courseId,
              lessonId,
              playbackRate: partial.playbackRate,
            })
          }
          if (partial.quality != null) {
            engine.setQuality(
              partial.quality === 'auto' ? 'auto' : String(partial.quality)
            )
            trackPlayerEvent(analyticsEndpoint, 'quality_changed', {
              courseId,
              lessonId,
              quality: String(partial.quality),
            })
          }
        }}
      />

      {showEndScreen && (
        <PlayerEndScreen
          metadata={metadata}
          onReplay={handleReplay}
          onNextLesson={onNextLesson}
          onPreviousLesson={onPreviousLesson}
          onBackToCourse={onBackToCourse}
          onMarkComplete={onMarkComplete}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          autoplayNext={preferences.autoplayNext}
          isFullscreen={isFullscreen}
        />
      )}

      {sessionLifecycle.isOffline && !sessionLifecycle.sessionExpired && (
        <SessionOfflineOverlay locale={activeLocale} />
      )}

      {sessionLifecycle.sessionExpired && (
        <SessionExpiredOverlay
          locale={activeLocale}
          isRenewing={sessionLifecycle.isRenewing}
          onResume={() => void sessionLifecycle.resumePlayback()}
          onRetry={() => void sessionLifecycle.resumePlayback()}
        />
      )}

      {isAdmin && showDebug && config?.adminDebug && (
        <PlayerDebugOverlay
          debug={config.adminDebug}
          capabilities={capabilities}
          snapshot={{
            uiState: uiStateLabel,
            engineState: engine.engineState,
            bufferedPercent: engine.bufferedPercent,
            isOnline: !sessionLifecycle.isOffline,
            seekCount: analyticsRef.current.seekCount,
            averageWatchTimeMs: analyticsRef.current.totalWatchMs,
            networkState: sessionLifecycle.isOffline ? 'offline' : 'online',
          }}
          engineState={engine.engineState}
          currentTime={currentTime}
          duration={duration}
          bufferedPercent={engine.bufferedPercent}
          sessionHealth={sessionLifecycle.sessionHealth}
        />
      )}
    </div>
  )
}
