'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Loader2, Plus, RefreshCw, Rss, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { JobSource } from '@/types/job-scraping'
import { toast } from 'sonner'

interface JobSourcesClientProps {
  locale: string
}

export default function JobSourcesClient({ locale }: JobSourcesClientProps) {
  const t = useTranslations('jobScraping')
  const [sources, setSources] = useState<JobSource[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'rss' as 'telegram' | 'linkedin' | 'rss',
    name: '',
    channel_username: '',
    feed_url: '',
    search_query: '',
    location: 'Iraq',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/job-sources')
      const data = (await res.json()) as { sources?: JobSource[] }
      setSources(data.sources ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleAdd = async () => {
    setSaving(true)
    try {
      let config: Record<string, string> = {}
      if (form.type === 'telegram') {
        config = { channel_username: form.channel_username.startsWith('@') ? form.channel_username : `@${form.channel_username}` }
      } else if (form.type === 'rss') {
        config = { feed_url: form.feed_url }
      } else {
        config = {
          search_query: form.search_query,
          location: form.location,
          job_type: 'full_time',
        }
      }

      const res = await fetch('/api/admin/job-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          name: form.name,
          config,
        }),
      })

      if (!res.ok) {
        toast.error(t('save_error'))
        return
      }

      toast.success(t('source_added'))
      setForm((f) => ({ ...f, name: '', channel_username: '', feed_url: '', search_query: '' }))
      void load()
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (source: JobSource) => {
    const res = await fetch(`/api/admin/job-sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !source.is_active }),
    })
    if (res.ok) void load()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('sources_title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('sources_subtitle')}</p>
        </div>
        <Link href={`/${locale}/admin/jobs/imported`}>
          <Button variant="outline" size="sm">
            {t('review_imports')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('add_source')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('source_type')}</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as typeof form.type }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telegram">
                    <span className="flex items-center gap-2">
                      <Send className="h-3.5 w-3.5" /> Telegram
                    </span>
                  </SelectItem>
                  <SelectItem value="rss">
                    <span className="flex items-center gap-2">
                      <Rss className="h-3.5 w-3.5" /> RSS
                    </span>
                  </SelectItem>
                  <SelectItem value="linkedin">LinkedIn (RapidAPI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('source_name')}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Iraq Jobs Telegram"
              />
            </div>
          </div>

          {form.type === 'telegram' && (
            <div className="space-y-2">
              <Label>{t('channel_username')}</Label>
              <Input
                value={form.channel_username}
                onChange={(e) => setForm((f) => ({ ...f, channel_username: e.target.value }))}
                placeholder="@iraqjobs"
              />
              <p className="text-xs text-muted-foreground">{t('telegram_hint')}</p>
            </div>
          )}

          {form.type === 'rss' && (
            <div className="space-y-2">
              <Label>{t('feed_url')}</Label>
              <Input
                value={form.feed_url}
                onChange={(e) => setForm((f) => ({ ...f, feed_url: e.target.value }))}
                placeholder="https://example.com/jobs.rss"
              />
            </div>
          )}

          {form.type === 'linkedin' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('search_query')}</Label>
                <Input
                  value={form.search_query}
                  onChange={(e) => setForm((f) => ({ ...f, search_query: e.target.value }))}
                  placeholder="software engineer"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('location')}</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">{t('linkedin_hint')}</p>
            </div>
          )}

          <Button onClick={() => void handleAdd()} disabled={saving || !form.name.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {t('add_source')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('active_sources')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('no_sources')}</p>
          ) : (
            <ul className="divide-y">
              {sources.map((source) => (
                <li key={source.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {source.type} · {source.total_imported} {t('imported_count')}
                      {source.last_checked_at &&
                        ` · ${new Date(source.last_checked_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Switch
                    checked={source.is_active}
                    onCheckedChange={() => void toggleActive(source)}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
