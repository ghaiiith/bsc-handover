'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useVideoStudio } from '@/components/instructor/video-studio/VideoStudioProvider'
import { formatStudioDate } from '@/lib/video-studio/format'
import type { VideoStudioActivityEvent } from '@/types/video-studio'

export default function VideoStudioActivitySection() {
  const t = useTranslations('studio.video_studio')
  const { payload, locale } = useVideoStudio()

  const events = useMemo<VideoStudioActivityEvent[]>(() => {
    const asset = payload?.asset
    if (!asset) return []

    const list: VideoStudioActivityEvent[] = []

    if (asset.uploadedAt) {
      list.push({
        id: 'uploaded',
        timestamp: asset.uploadedAt,
        actionKey: 'activity_uploaded',
        user: null,
        details: asset.originalFilename ?? asset.id,
        source: 'studio',
      })
    }
    if (asset.lastSync) {
      list.push({
        id: 'synced',
        timestamp: asset.lastSync,
        actionKey: 'activity_synced',
        user: null,
        details: asset.provider ?? '',
        source: 'provider',
      })
    }
    if (asset.updatedAt) {
      list.push({
        id: 'updated',
        timestamp: asset.updatedAt,
        actionKey: 'activity_metadata_changed',
        user: null,
        details: asset.status,
        source: 'system',
      })
    }

    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [payload?.asset])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{t('section_activity_title')}</h3>
        <p className="text-sm text-muted-foreground">{t('section_activity_desc')}</p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('activity_empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{t(event.actionKey)}</p>
                  <p className="text-xs text-muted-foreground">{event.details}</p>
                </div>
                <time className="text-xs tabular-nums text-muted-foreground">
                  {formatStudioDate(event.timestamp, locale)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
