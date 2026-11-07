'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cloud,
  Loader2,
  RefreshCw,
  Shield,
  Video,
  XCircle,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ProviderRow {
  provider_id: string
  enabled: boolean
  is_primary: boolean
  priority: number
  status: string
  region: string | null
  last_health_check: string | null
  last_error: string | null
  estimated_monthly_cost_usd: number
  estimated_storage_cost_usd: number
  estimated_streaming_cost_usd: number
}

const PROVIDER_LABELS: Record<string, string> = {
  vimeo: 'Vimeo',
  r2: 'Cloudflare R2',
  aws: 'AWS S3',
  backblaze: 'Backblaze B2',
  mux: 'Mux',
  bunny: 'Bunny Stream',
  cloudinary: 'Cloudinary Video',
}

function statusBadge(status: string) {
  if (status === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
      </span>
    )
  }
  if (status === 'warning' || status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700">
        <Activity className="h-3.5 w-3.5" /> {status}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <XCircle className="h-3.5 w-3.5" /> {status}
    </span>
  )
}

export default function VideoProvidersDashboard() {
  const locale = useLocale()
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/video-providers')
      const data = (await res.json()) as { providers: ProviderRow[] }
      setProviders(data.providers ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const runHealthCheck = async (providerId?: string) => {
    setChecking(true)
    try {
      await fetch(
        providerId
          ? '/api/admin/video-providers'
          : '/api/admin/video-providers?action=health-check-all',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(providerId ? { providerId } : {}),
        }
      )
      await load()
    } finally {
      setChecking(false)
    }
  }

  const setPrimary = async (providerId: string) => {
    await fetch('/api/admin/video-providers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, isPrimary: true, enabled: true }),
    })
    await load()
  }

  const toggleEnabled = async (provider: ProviderRow) => {
    await fetch('/api/admin/video-providers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: provider.provider_id, enabled: !provider.enabled }),
    })
    await load()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalMonthly = providers.reduce((s, p) => s + Number(p.estimated_monthly_cost_usd), 0)
  const primaryProvider = providers.find((p) => p.is_primary)
  const primaryOffline =
    primaryProvider &&
    (primaryProvider.status === 'offline' || primaryProvider.status === 'degraded')

  return (
    <div className="space-y-6">
      {primaryOffline && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Primary provider unavailable</p>
          <p className="mt-1 text-xs opacity-90">
            {PROVIDER_LABELS[primaryProvider.provider_id] ?? primaryProvider.provider_id} is{' '}
            {primaryProvider.status}. Videos are not auto-migrated — manually set another provider
            as primary or choose a per-lesson upload provider.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Video Providers</h1>
          <p className="text-sm text-muted-foreground">
            Multi-provider architecture — Vimeo primary, R2 advanced processing
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${locale}/admin/video-analytics`}
            className={buttonVariants({ variant: 'outline', className: 'gap-2' })}
          >
            <BarChart3 className="h-4 w-4" /> Analytics
          </Link>
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button disabled={checking} onClick={() => void runHealthCheck()} className="gap-2">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Run health checks
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active providers</p>
            <p className="text-2xl font-bold">
              {providers.filter((p) => p.enabled).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Primary upload</p>
            <p className="text-2xl font-bold">
              {PROVIDER_LABELS[providers.find((p) => p.is_primary)?.provider_id ?? 'vimeo'] ??
                'Vimeo'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Est. monthly total</p>
            <p className="text-2xl font-bold">${totalMonthly.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.provider_id}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {provider.provider_id === 'vimeo' ? (
                    <Video className="h-5 w-5 text-primary" />
                  ) : (
                    <Cloud className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {PROVIDER_LABELS[provider.provider_id] ?? provider.provider_id}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Priority {provider.priority}
                      {provider.region ? ` · ${provider.region}` : ''}
                    </p>
                  </div>
                </div>
                {statusBadge(provider.status)}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Storage est.</dt>
                  <dd>${Number(provider.estimated_storage_cost_usd).toFixed(2)}/mo</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Streaming est.</dt>
                  <dd>${Number(provider.estimated_streaming_cost_usd).toFixed(2)}/mo</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Monthly est.</dt>
                  <dd>${Number(provider.estimated_monthly_cost_usd).toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Last check</dt>
                  <dd className="truncate text-xs">
                    {provider.last_health_check
                      ? new Date(provider.last_health_check).toLocaleString()
                      : '—'}
                  </dd>
                </div>
              </dl>

              {provider.last_error && (
                <p className="rounded border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive">
                  {provider.last_error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={provider.is_primary ? 'default' : 'outline'}
                  disabled={provider.is_primary}
                  onClick={() => void setPrimary(provider.provider_id)}
                >
                  {provider.is_primary ? 'Primary' : 'Set primary'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void toggleEnabled(provider)}
                >
                  {provider.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void runHealthCheck(provider.provider_id)}
                >
                  Test connection
                </Button>
              </div>

              <p className={cn('text-xs text-muted-foreground')}>
                {provider.provider_id === 'r2'
                  ? 'Desktop Studio pipeline — HLS, encryption, watermark.'
                  : provider.provider_id === 'vimeo'
                    ? 'Default web upload — direct browser upload, secure embed playback.'
                    : 'Future provider — architecture ready, not yet active.'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
