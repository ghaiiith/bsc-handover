'use client'

import { useTranslations } from 'next-intl'
import type { LessonPlaybackMetadata } from '@/types/video-player'

interface PlayerHeaderProps {
  metadata?: LessonPlaybackMetadata
  currentTime: number
  duration: number
  visible: boolean
}

export default function PlayerHeader({
  metadata,
  currentTime,
  duration,
  visible,
}: PlayerHeaderProps) {
  const t = useTranslations('video_player')

  if (!metadata) return null

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 pt-3 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="text-xs font-medium text-white/70">{metadata.courseName}</p>
      <p className="text-[11px] text-white/50">{metadata.moduleName}</p>
      <h2 className="mt-1 line-clamp-1 text-sm font-semibold text-white">
        {t('lesson_number', { number: metadata.lessonNumber })} · {metadata.lessonName}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/60">
        <span>
          {t('course_progress', { percent: Math.round(metadata.courseProgress) })}
        </span>
        <span className="num-en">
          {formatTime(currentTime)} / {formatTime(duration || metadata.durationMinutes * 60)}
        </span>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
