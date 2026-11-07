'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Bell, Link2, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Settings {
  enabled: boolean
  minScore: number
  telegramLinked: boolean
  telegramAvailable: boolean
  telegramBot: string | null
  emailIncluded: boolean
}

/**
 * Round 9 (BS-104): opt-in high-match job alerts. Off by default; the
 * candidate picks the threshold (80% by default), links Telegram with a
 * one-time code, and sees plainly whether email is included in their plan.
 */
export default function JobAlertsSection() {
  const t = useTranslations('job_alerts')
  const [s, setS] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [link, setLink] = useState<{ code: string; deepLink: string | null } | null>(null)

  const load = async () => {
    const res = await fetch('/api/job-alerts/settings')
    if (res.ok) setS((await res.json()) as Settings)
  }
  useEffect(() => {
    void load()
  }, [])

  const patch = async (p: Partial<Pick<Settings, 'enabled' | 'minScore'>>) => {
    if (!s) return
    setSaving(true)
    const optimistic = { ...s, ...p }
    setS(optimistic)
    const res = await fetch('/api/job-alerts/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(t('save_failed'))
      void load()
    }
  }

  const mintLink = async () => {
    const res = await fetch('/api/job-alerts/telegram-link', { method: 'POST' })
    if (!res.ok) {
      toast.error(t('telegram_unavailable'))
      return
    }
    setLink((await res.json()) as { code: string; deepLink: string | null })
  }

  const unlink = async () => {
    await fetch('/api/job-alerts/telegram-link', { method: 'DELETE' })
    setLink(null)
    void load()
  }

  if (!s) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">{t('intro')}</p>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="job-alerts-enabled">{t('enable')}</Label>
          <Switch
            id="job-alerts-enabled"
            checked={s.enabled}
            disabled={saving}
            onCheckedChange={(v) => void patch({ enabled: v })}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('threshold', { value: s.minScore })}</Label>
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={s.minScore}
            disabled={!s.enabled || saving}
            onChange={(e) => setS({ ...s, minScore: Number(e.target.value) })}
            onMouseUp={(e) => void patch({ minScore: Number((e.target as HTMLInputElement).value) })}
            onTouchEnd={(e) => void patch({ minScore: Number((e.target as HTMLInputElement).value) })}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">{t('threshold_hint')}</p>
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Send className="h-4 w-4 text-sky-500" />
            {t('telegram')}
          </p>
          {!s.telegramAvailable ? (
            <p className="text-xs text-muted-foreground">{t('telegram_unavailable')}</p>
          ) : s.telegramLinked ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-emerald-600">{t('telegram_linked')}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => void unlink()}>
                {t('unlink')}
              </Button>
            </div>
          ) : link ? (
            <div className="space-y-2 text-xs">
              <p>{t('telegram_step', { code: link.code })}</p>
              {link.deepLink && (
                <a
                  href={link.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {t('open_bot')}
                </a>
              )}
              <div>
                <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
                  {t('check_linked')}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => void mintLink()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              <span className="ms-1">{t('link_telegram')}</span>
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {s.emailIncluded ? t('email_included') : t('email_not_included')}
        </p>
      </CardContent>
    </Card>
  )
}
