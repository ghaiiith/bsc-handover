'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { BarChart3, HardDrive, Loader2, RefreshCw, Video } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AnalyticsData {
  totalAssets: number
  readyAssets: number
  totalStorageBytes: number
  providerDistribution: Record<string, number>
  monthlyCost: {
    storageCostUsd: number
    uploadCostUsd: number
    streamingCostUsd: number
    processingCostUsd: number
    apiCostUsd: number
    monthlyCostUsd: number
    yearlyCostUsd: number
  }
  costPerStudent: number
  costPerView: number
  costPerHourWatched: number
  costPerCourse: number
  costPerInstructor: number
  providerUsage: Array<{
    provider: string
    assets: number
    storageBytes: number
    monthlyCostUsd: number
  }>
  uploadHistory: Array<{ date: string; count: number }>
}

const PROVIDER_LABELS: Record<string, string> = {
  vimeo: 'Vimeo',
  r2: 'Cloudflare R2',
  aws: 'AWS S3',
  backblaze: 'Backblaze B2',
  mux: 'Mux',
  bunny: 'Bunny Stream',
  cloudinary: 'Cloudinary',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function VideoAnalyticsDashboard() {
  const locale = useLocale()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/video-analytics')
      if (res.ok) {
        setData((await res.json()) as AnalyticsData)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Failed to load video analytics.
      </p>
    )
  }

  const maxUploads = Math.max(...data.uploadHistory.map((u) => u.count), 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Video Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Storage, bandwidth, and cost across all video providers
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${locale}/admin/video-providers`}
            className={buttonVariants({ variant: 'outline', className: 'gap-2' })}
          >
            <Video className="h-4 w-4" /> Providers
          </Link>
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total videos</p>
            <p className="text-2xl font-bold">{data.readyAssets}</p>
            <p className="text-xs text-muted-foreground">{data.totalAssets} total assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <HardDrive className="h-3.5 w-3.5" /> Storage
            </p>
            <p className="text-2xl font-bold">{formatBytes(data.totalStorageBytes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Monthly cost</p>
            <p className="text-2xl font-bold">${data.monthlyCost.monthlyCostUsd.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              ${data.monthlyCost.yearlyCostUsd.toFixed(2)}/yr
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" /> Streaming
            </p>
            <p className="text-2xl font-bold">${data.monthlyCost.streamingCostUsd.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">/month est.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold">Cost breakdown</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Storage</dt>
                <dd>${data.monthlyCost.storageCostUsd.toFixed(3)}/mo</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Streaming</dt>
                <dd>${data.monthlyCost.streamingCostUsd.toFixed(3)}/mo</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Upload</dt>
                <dd>${data.monthlyCost.uploadCostUsd.toFixed(3)}/mo</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Processing</dt>
                <dd>${data.monthlyCost.processingCostUsd.toFixed(3)}/mo</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">API</dt>
                <dd>${data.monthlyCost.apiCostUsd.toFixed(3)}/mo</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Monthly total</dt>
                <dd className="font-semibold">${data.monthlyCost.monthlyCostUsd.toFixed(2)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold">Cost per unit</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Per student</dt>
                <dd>${data.costPerStudent.toFixed(4)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Per view</dt>
                <dd>${data.costPerView.toFixed(4)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Per hour watched</dt>
                <dd>${data.costPerHourWatched.toFixed(4)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Per course</dt>
                <dd>${data.costPerCourse.toFixed(3)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Per instructor</dt>
                <dd>${data.costPerInstructor.toFixed(3)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold">Provider usage</h3>
            <div className="space-y-3">
              {data.providerUsage.map((row) => (
                <div
                  key={row.provider}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {PROVIDER_LABELS[row.provider] ?? row.provider}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.assets} videos · {formatBytes(row.storageBytes)}
                    </p>
                  </div>
                  <p className="font-semibold">${row.monthlyCostUsd.toFixed(2)}/mo</p>
                </div>
              ))}
              {data.providerUsage.length === 0 && (
                <p className="text-sm text-muted-foreground">No video assets yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold">Upload history (30 days)</h3>
            <div className="flex items-end gap-1 h-32">
              {data.uploadHistory.map((point) => (
                <div
                  key={point.date}
                  className="flex-1 rounded-t bg-primary/70 transition-all"
                  style={{ height: `${Math.max(8, (point.count / maxUploads) * 100)}%` }}
                  title={`${point.date}: ${point.count}`}
                />
              ))}
              {data.uploadHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">No uploads recorded.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
