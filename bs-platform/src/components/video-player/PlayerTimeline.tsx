'use client'

import { memo, useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { formatPlaybackTimeTabular } from '@/lib/playback/preferences'
import type {
  PlayerBookmark,
  PlayerChapter,
  PlayerTimelineEvent,
  SeekPreviewSprites,
} from '@/types/video-player'

interface PlayerTimelineProps {
  currentTime: number
  duration: number
  bufferedPercent: number
  chapters?: PlayerChapter[]
  bookmarks?: PlayerBookmark[]
  timelineEvents?: PlayerTimelineEvent[]
  seekPreview?: SeekPreviewSprites
  onSeek: (percent: number) => void
  onSeekStart?: () => void
  onSeekEnd?: () => void
}

function PlayerTimelineComponent({
  currentTime,
  duration,
  bufferedPercent,
  chapters = [],
  bookmarks = [],
  timelineEvents = [],
  onSeek,
  onSeekStart,
  onSeekEnd,
}: PlayerTimelineProps) {
  const t = useTranslations('video_player')
  const trackRef = useRef<HTMLDivElement>(null)
  const [hoverPercent, setHoverPercent] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const percentFromEvent = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || rect.width <= 0) return 0
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return ratio * 100
    },
    []
  )

  const handlePointerMove = useCallback(
    (clientX: number) => {
      setHoverPercent(percentFromEvent(clientX))
    },
    [percentFromEvent]
  )

  const handleSeekValue = useCallback(
    (value: number) => {
      onSeek(value)
    },
    [onSeek]
  )

  const hoverTime =
    hoverPercent != null && duration > 0
      ? (hoverPercent / 100) * duration
      : null

  const hoverChapter =
    hoverTime != null
      ? chapters.find((ch) => {
          const end = ch.endSeconds ?? duration
          return hoverTime >= ch.startSeconds && hoverTime < end
        })
      : null

  return (
    <div
      ref={trackRef}
      className="group/timeline relative mb-4 h-8 w-full cursor-pointer py-3 md:h-9"
      onMouseMove={(e) => handlePointerMove(e.clientX)}
      onMouseLeave={() => setHoverPercent(null)}
      onTouchMove={(e) => {
        const touch = e.touches[0]
        if (touch) handlePointerMove(touch.clientX)
      }}
      onTouchEnd={() => setHoverPercent(null)}
      data-player-controls
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/15 transition-all duration-200 group-hover/timeline:h-2 md:h-2 group-hover/timeline:md:h-2.5">
        <div
          className="absolute inset-y-0 start-0 bg-white/30"
          style={{ width: `${bufferedPercent}%` }}
        />
        <div
          className="absolute inset-y-0 start-0 bg-primary"
          style={{ width: `${progress}%` }}
        />
        {hoverPercent != null && (
          <div
            className="absolute inset-y-0 start-0 bg-white/15"
            style={{ width: `${hoverPercent}%` }}
          />
        )}
      </div>

      {chapters.map((chapter) => {
        const left = duration > 0 ? (chapter.startSeconds / duration) * 100 : 0
        return (
          <div
            key={chapter.id}
            className="pointer-events-none absolute top-1/2 z-10 h-3 w-0.5 -translate-y-1/2 rounded-full bg-amber-400"
            style={{ insetInlineStart: `${left}%` }}
            title={chapter.title}
          />
        )
      })}

      {bookmarks.map((bookmark) => {
        const left = duration > 0 ? (bookmark.timestampSeconds / duration) * 100 : 0
        return (
          <div
            key={bookmark.id}
            className="pointer-events-none absolute top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full bg-sky-400"
            style={{ insetInlineStart: `${left}%` }}
            title={bookmark.title ?? formatPlaybackTimeTabular(bookmark.timestampSeconds)}
          />
        )
      })}

      {timelineEvents.map((event) => {
        const left = duration > 0 ? (event.startSeconds / duration) * 100 : 0
        const color =
          event.type === 'quiz'
            ? 'bg-violet-400'
            : event.type === 'assignment'
              ? 'bg-orange-400'
              : 'bg-emerald-400'
        return (
          <div
            key={event.id}
            className={`pointer-events-none absolute top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full ${color}`}
            style={{ insetInlineStart: `${left}%` }}
            title={event.title}
          />
        )
      })}

        <div
          className="pointer-events-none absolute top-1/2 z-20 h-3 w-3 -translate-y-1/2 rounded-full bg-primary shadow-md ring-2 ring-black/30 transition-transform duration-200 group-hover/timeline:scale-110 motion-reduce:transition-none"
          style={{ insetInlineStart: `calc(${progress}% - 6px)` }}
        />

      {hoverTime != null && (
        <div
          className="pointer-events-none absolute -top-11 z-30 -translate-x-1/2 rounded-lg bg-black/92 px-2.5 py-1.5 text-center text-xs text-white shadow-xl ring-1 ring-white/10 transition-opacity duration-150 animate-in fade-in motion-reduce:animate-none"
          style={{ insetInlineStart: `${hoverPercent}%` }}
        >
          <p className="tabular-nums font-medium">{formatPlaybackTimeTabular(hoverTime)}</p>
          {hoverChapter && (
            <p className="mt-0.5 max-w-[10rem] truncate text-[10px] text-white/70">
              {hoverChapter.title}
            </p>
          )}
        </div>
      )}

      <input
        type="range"
        min={0}
        max={100}
        step={0.05}
        value={progress}
        onChange={(e) => handleSeekValue(Number(e.target.value))}
        onMouseDown={() => {
          setIsDragging(true)
          onSeekStart?.()
        }}
        onMouseUp={() => {
          setIsDragging(false)
          onSeekEnd?.()
        }}
        onTouchStart={() => {
          setIsDragging(true)
          onSeekStart?.()
        }}
        onTouchEnd={() => {
          setIsDragging(false)
          onSeekEnd?.()
        }}
        className={`absolute inset-0 z-30 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 ${
          isDragging ? 'opacity-100' : ''
        } [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full`}
        aria-label={t('seek_bar')}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={formatPlaybackTimeTabular(currentTime)}
      />
    </div>
  )
}

const PlayerTimeline = memo(PlayerTimelineComponent)
export default PlayerTimeline
