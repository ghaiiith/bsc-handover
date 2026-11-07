'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolvePlaybackConfig } from '@/lib/playback/resolver'
import { cn } from '@/lib/utils'
import type { SecurePlaybackResponse } from '@/types/content-protection'
import type { ResolvedPlaybackConfig } from '@/types/video-player'

interface CoursePreviewPlayerProps {
  courseId: string
  poster?: string | null
  title: string
  className?: string
}

// BS-97: 'missing' is a course with no preview asset configured — a review
// finding, not a playback failure, so it must not read as an error.
type ViewState = 'loading' | 'ready' | 'processing' | 'error' | 'missing'

export default function CoursePreviewPlayer({
  courseId,
  poster,
  title,
  className,
}: CoursePreviewPlayerProps) {
  const t = useTranslations('video_player')
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<import('hls.js').default | null>(null)
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [playbackConfig, setPlaybackConfig] = useState<ResolvedPlaybackConfig | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const cleanup = useCallback(() => {
    hlsRef.current?.destroy()
    hlsRef.current = null
    const video = videoRef.current
    if (video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [])

  const load = useCallback(async () => {
    cleanup()
    setViewState('loading')
    setPlaybackConfig(null)

    try {
      const res = await fetch(`/api/courses/${courseId}/preview/playback`, {
        cache: 'no-store',
      })

      if (!res.ok) {
        setViewState('error')
        return
      }

      const data = (await res.json()) as SecurePlaybackResponse

      if (data.status === 'pending' || data.status === 'uploading') {
        setViewState('processing')
        return
      }

      if (data.status === 'none') {
        setViewState('missing')
        return
      }

      if (data.status !== 'ready') {
        setViewState('error')
        return
      }

      const resolved = resolvePlaybackConfig(data, { poster })
      if ('error' in resolved) {
        setViewState('error')
        return
      }

      setPlaybackConfig(resolved)
      setViewState('ready')
    } catch {
      setViewState('error')
    }
  }, [cleanup, courseId, poster])

  useEffect(() => {
    void load()
    return cleanup
  }, [load, cleanup, retryKey])

  useEffect(() => {
    if (viewState !== 'ready' || !playbackConfig) return
    if (playbackConfig.engine === 'embed') return

    const video = videoRef.current
    if (!video) return

    let cancelled = false

    const attach = async () => {
      const onVideoError = () => {
        if (!cancelled) setViewState('error')
      }
      video.addEventListener('error', onVideoError, { once: true })

      if (playbackConfig.engine === 'hls' && playbackConfig.hlsUrl) {
        const { default: Hls } = await import('hls.js')
        if (cancelled) return

        if (Hls.isSupported()) {
          const hls = new Hls()
          hlsRef.current = hls
          hls.loadSource(playbackConfig.hlsUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.ERROR, (_event, detail) => {
            if (!detail.fatal || cancelled) return
            if (playbackConfig.mp4FallbackUrl) {
              hls.destroy()
              hlsRef.current = null
              video.src = playbackConfig.mp4FallbackUrl
              void video.load()
              return
            }
            setViewState('error')
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = playbackConfig.hlsUrl
        } else if (playbackConfig.mp4FallbackUrl) {
          video.src = playbackConfig.mp4FallbackUrl
        } else {
          setViewState('error')
        }
        return
      }

      if (playbackConfig.streamUrl) {
        video.src = playbackConfig.streamUrl
        return
      }

      setViewState('error')
    }

    void attach()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [viewState, playbackConfig, cleanup])

  if (viewState === 'loading') {
    return (
      <div
        className={cn(
          'relative flex aspect-video w-full items-center justify-center bg-muted',
          className
        )}
      >
        {poster && (
          <Image
            src={poster}
            alt=""
            fill
            className="object-cover opacity-50 blur-sm"
            sizes="(max-width: 1024px) 100vw, 360px"
          />
        )}
        <Loader2 className="relative z-10 h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (viewState === 'processing') {
    return (
      <PreviewPosterFrame poster={poster} title={title} className={className}>
        <p className="text-sm font-medium text-white">{t('errors.processing')}</p>
      </PreviewPosterFrame>
    )
  }

  if (viewState === 'missing') {
    return (
      <PreviewPosterFrame poster={poster} title={title} className={className}>
        <p className="max-w-xs text-sm font-medium text-white">{t('errors.no_preview')}</p>
      </PreviewPosterFrame>
    )
  }

  if (viewState === 'error') {
    return (
      <PreviewPosterFrame poster={poster} title={title} className={className}>
        <p className="mb-3 max-w-xs text-sm font-medium text-white">
          {t('errors.unavailable')}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setRetryKey((key) => key + 1)}
        >
          <RefreshCw className="me-2 h-4 w-4" />
          {t('retry')}
        </Button>
      </PreviewPosterFrame>
    )
  }

  if (playbackConfig?.engine === 'embed' && playbackConfig.embedUrl) {
    return (
      <div className={cn('relative aspect-video w-full overflow-hidden bg-black', className)}>
        <iframe
          src={playbackConfig.embedUrl}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      className={cn('aspect-video w-full bg-black object-contain', className)}
      controls
      playsInline
      preload="metadata"
      poster={poster ?? undefined}
      controlsList="nodownload noremoteplayback"
    />
  )
}

function PreviewPosterFrame({
  poster,
  title,
  className,
  children,
}: {
  poster?: string | null
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden bg-muted px-4 text-center',
        className
      )}
    >
      {poster ? (
        <Image
          src={poster}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 360px"
        />
      ) : null}
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
