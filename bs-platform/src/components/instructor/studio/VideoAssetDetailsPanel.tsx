'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, RefreshCw, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface VideoAssetDetails {
  id: string
  provider: string
  providerVideoId: string | null
  status: string
  providerStatus: string | null
  providerProcessingStatus: string | null
  providerHealth: string | null
  durationSeconds: number | null
  resolution: string | null
  fileSize: number | null
  thumbnailUrl: string | null
  uploadedAt: string | null
  lastSync: string | null
  privacy: unknown
}

interface CostEstimate {
  storageCostUsd: number
  streamingCostUsd: number
  monthlyCostUsd: number
}

interface VideoAssetDetailsPanelProps {
  courseId: string
  lessonId: string
  assetId: string | null
}

const PROVIDER_LABELS: Record<string, string> = {
  vimeo: 'Vimeo',
  r2: 'Cloudflare R2',
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function statusClass(status: string | null): string {
  if (status === 'ready' || status === 'healthy' || status === 'complete') {
    return 'text-emerald-700 bg-emerald-50'
  }
  if (status === 'uploading' || status === 'processing' || status === 'pending') {
    return 'text-amber-700 bg-amber-50'
  }
  if (status === 'failed' || status === 'offline') {
    return 'text-destructive bg-destructive/10'
  }
  return 'text-muted-foreground bg-muted'
}

export default function VideoAssetDetailsPanel({
  courseId,
  lessonId,
  assetId,
}: VideoAssetDetailsPanelProps) {
  const t = useTranslations('video_providers')
  const [loading, setLoading] = useState(false)
  const [asset, setAsset] = useState<VideoAssetDetails | null>(null)
  const [cost, setCost] = useState<CostEstimate | null>(null)
  const [uploadProvider, setUploadProvider] = useState<string>('default')
  const [savingProvider, setSavingProvider] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/instructor/courses/${courseId}/lessons/${lessonId}/video-asset`
      )
      const data = (await res.json()) as {
        asset: VideoAssetDetails | null
        cost: CostEstimate | null
        uploadProvider: string | null
      }
      setAsset(data.asset)
      setCost(data.cost)
      setUploadProvider(data.uploadProvider ?? 'default')
    } finally {
      setLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => {
    void load()
  }, [load, assetId])

  const saveProvider = async (value: string) => {
    setSavingProvider(true)
    try {
      const uploadProviderValue =
        value === 'default' ? null : (value as 'vimeo' | 'r2')
      await fetch(`/api/instructor/courses/${courseId}/lessons/${lessonId}/video-asset`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadProvider: uploadProviderValue }),
      })
      setUploadProvider(value)
    } finally {
      setSavingProvider(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">{t('video_details')}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t('upload_provider')}</Label>
        <Select
          value={uploadProvider}
          disabled={savingProvider}
          onValueChange={(v) => {
            if (v) void saveProvider(v)
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{t('provider_default')}</SelectItem>
            <SelectItem value="vimeo">Vimeo</SelectItem>
            <SelectItem value="r2">Cloudflare R2</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">{t('provider_switch_hint')}</p>
      </div>

      {!assetId ? (
        <p className="text-xs text-muted-foreground">{t('no_video')}</p>
      ) : loading && !asset ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : asset ? (
        <div className="space-y-3">
          {asset.thumbnailUrl && (
            <div className="overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.thumbnailUrl}
                alt=""
                className="aspect-video w-full object-cover"
              />
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-muted-foreground">{t('provider')}</dt>
              <dd className="font-medium">
                {PROVIDER_LABELS[asset.provider] ?? asset.provider}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('processing_status')}</dt>
              <dd>
                <span
                  className={cn(
                    'inline-block rounded px-1.5 py-0.5 text-[11px] capitalize',
                    statusClass(asset.providerProcessingStatus ?? asset.status)
                  )}
                >
                  {asset.providerProcessingStatus ?? asset.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('duration')}</dt>
              <dd>{formatDuration(asset.durationSeconds)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('resolution')}</dt>
              <dd>{asset.resolution ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('video_size')}</dt>
              <dd>{formatBytes(asset.fileSize)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('upload_date')}</dt>
              <dd>
                {asset.uploadedAt
                  ? new Date(asset.uploadedAt).toLocaleDateString()
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('streaming_status')}</dt>
              <dd>
                <span
                  className={cn(
                    'inline-block rounded px-1.5 py-0.5 text-[11px] capitalize',
                    statusClass(asset.providerStatus ?? asset.status)
                  )}
                >
                  {asset.providerStatus ?? asset.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('health')}</dt>
              <dd>
                <span
                  className={cn(
                    'inline-block rounded px-1.5 py-0.5 text-[11px] capitalize',
                    statusClass(asset.providerHealth)
                  )}
                >
                  {asset.providerHealth ?? 'unknown'}
                </span>
              </dd>
            </div>
            {asset.providerVideoId && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">{t('video_id')}</dt>
                <dd className="truncate font-mono text-[11px]">{asset.providerVideoId}</dd>
              </div>
            )}
            {cost && (
              <>
                <div>
                  <dt className="text-muted-foreground">{t('est_monthly_cost')}</dt>
                  <dd>${cost.monthlyCostUsd.toFixed(3)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('est_streaming_cost')}</dt>
                  <dd>${cost.streamingCostUsd.toFixed(3)}</dd>
                </div>
              </>
            )}
            {asset.lastSync && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">{t('last_sync')}</dt>
                <dd>{new Date(asset.lastSync).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : null}
    </div>
  )
}
