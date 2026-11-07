'use client'

import { useEffect, useMemo, useState } from 'react'
import type { WatermarkConfig } from '@/types/content-protection'

interface VideoWatermarkOverlayProps {
  config: WatermarkConfig
  displayName?: string | null
  userId?: string | null
  lessonTitle?: string | null
  courseTitle?: string | null
  className?: string
}

function buildWatermarkText(
  config: WatermarkConfig,
  ctx: {
    displayName?: string | null
    userId?: string | null
    lessonTitle?: string | null
    courseTitle?: string | null
    timestamp: string
  }
): string {
  const parts: string[] = []
  for (const line of config.lines) {
    switch (line) {
      case 'displayName':
        if (ctx.displayName) parts.push(ctx.displayName)
        break
      case 'userId':
        if (ctx.userId) parts.push(ctx.userId.slice(0, 8))
        break
      case 'timestamp':
        parts.push(ctx.timestamp)
        break
      case 'lessonTitle':
        if (ctx.lessonTitle) parts.push(ctx.lessonTitle)
        break
      case 'courseTitle':
        if (ctx.courseTitle) parts.push(ctx.courseTitle)
        break
      default:
        break
    }
  }
  return parts.join(' · ')
}

const POSITION_CLASS: Record<WatermarkConfig['position'], string> = {
  'top-left': 'left-3 top-3',
  'top-right': 'right-3 top-3',
  'bottom-left': 'left-3 bottom-14',
  'bottom-right': 'right-3 bottom-14',
}

export default function VideoWatermarkOverlay({
  config,
  displayName,
  userId,
  lessonTitle,
  courseTitle,
  className,
}: VideoWatermarkOverlayProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!config.enabled) return
    const interval = window.setInterval(
      () => setNow(new Date()),
      config.updateIntervalSeconds * 1000
    )
    return () => window.clearInterval(interval)
  }, [config.enabled, config.updateIntervalSeconds])

  const text = useMemo(
    () =>
      buildWatermarkText(config, {
        displayName,
        userId,
        lessonTitle,
        courseTitle,
        timestamp: now.toLocaleString(),
      }),
    [config, displayName, userId, lessonTitle, courseTitle, now]
  )

  if (!config.enabled || !text) return null

  return (
    <div
      className={`pointer-events-none absolute z-20 max-w-[70%] select-none ${POSITION_CLASS[config.position]} ${className ?? ''}`}
      aria-hidden
    >
      <p
        className="whitespace-pre-wrap break-words font-medium leading-snug text-white drop-shadow"
        style={{ opacity: config.opacity, fontSize: config.fontSize }}
      >
        {text}
      </p>
    </div>
  )
}
