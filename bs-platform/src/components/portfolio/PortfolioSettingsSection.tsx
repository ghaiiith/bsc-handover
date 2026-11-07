'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check, ExternalLink, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCount } from '@/lib/format-number'
import { getAppUrl } from '@/lib/seo/metadata'
import { sanitizePortfolioSlugInput, isValidPortfolioSlug } from '@/lib/portfolio/slug-validation'
import { toast } from 'sonner'

interface PortfolioSettingsSectionProps {
  locale: string
  userId: string
}

interface TemplateOption {
  id: string
  name: string
  name_ar: string | null
  description: string | null
  preview_image_url: string | null
}

interface SettingsState {
  portfolio_is_public: boolean
  portfolio_slug: string | null
  portfolio_template_id: string | null
  templates: TemplateOption[]
  viewStats: { total: number; thisMonth: number }
  checklist: {
    basicInfo: boolean
    skillsCount: number
    experienceCount: number
    educationCount: number
    projectsCount: number
    completedCoursesCount: number
    hasDefaultCv: boolean
  }
}

export default function PortfolioSettingsSection({
  locale,
  userId,
}: PortfolioSettingsSectionProps) {
  const t = useTranslations('portfolio')
  const isAr = locale === 'ar'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsState | null>(null)
  const [slugInput, setSlugInput] = useState('')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle')

  const appUrl = getAppUrl()
  const fullUrl = settings?.portfolio_slug
    ? `${appUrl}/${locale}/portfolio/${settings.portfolio_slug}`
    : null

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/settings')
      if (!res.ok) return
      const data = (await res.json()) as SettingsState
      setSettings(data)
      setSlugInput(data.portfolio_slug ?? '')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const saveSlug = useCallback(async (slug: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/portfolio/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_slug: slug }),
      })
      if (res.status === 409) {
        setSlugStatus('taken')
        return
      }
      if (!res.ok) {
        setSlugStatus('invalid')
        return
      }
      const data = (await res.json()) as { portfolio_slug: string }
      setSettings((s) => (s ? { ...s, portfolio_slug: data.portfolio_slug } : s))
      setSlugStatus('available')
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    if (!settings) return
    const timer = setTimeout(() => {
      const cleaned = sanitizePortfolioSlugInput(slugInput)
      if (cleaned === settings.portfolio_slug) return
      if (!isValidPortfolioSlug(cleaned)) return
      void saveSlug(cleaned)
    }, 1000)
    return () => clearTimeout(timer)
  }, [slugInput, settings, saveSlug])

  // Report BS-35: pick which uploaded HTML template renders the public page.
  const saveTemplate = async (templateId: string | null) => {
    setSaving(true)
    try {
      const res = await fetch('/api/portfolio/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_template_id: templateId }),
      })
      if (!res.ok) {
        toast.error(t('save_error'))
        return
      }
      setSettings((s) => (s ? { ...s, portfolio_template_id: templateId } : s))
      toast.success(t('template_saved'))
    } finally {
      setSaving(false)
    }
  }

  const saveVisibility = async (value: boolean) => {
    setSaving(true)
    try {
      const res = await fetch('/api/portfolio/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_is_public: value }),
      })
      if (!res.ok) {
        toast.error(t('save_error'))
        return
      }
      setSettings((s) => (s ? { ...s, portfolio_is_public: value } : s))
    } finally {
      setSaving(false)
    }
  }

  const checkSlug = async () => {
    const cleaned = sanitizePortfolioSlugInput(slugInput)
    if (!isValidPortfolioSlug(cleaned)) {
      setSlugStatus('invalid')
      return
    }
    const res = await fetch(
      `/api/portfolio/check-slug?slug=${encodeURIComponent(cleaned)}&excludeUserId=${userId}`
    )
    const data = (await res.json()) as { available: boolean }
    setSlugStatus(data.available ? 'available' : 'taken')
  }

  const copyLink = async () => {
    if (!fullUrl) return
    try {
      await navigator.clipboard.writeText(fullUrl)
      toast.success(t('link_copied'))
    } catch {
      toast.error(t('save_error'))
    }
  }

  if (loading || !settings) {
    return (
      <Card className="mt-8">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>{t('settings_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="portfolio-public">{t('visibility_label')}</Label>
          <Switch
            id="portfolio-public"
            checked={settings.portfolio_is_public}
            disabled={saving}
            onCheckedChange={(v) => void saveVisibility(v)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="portfolio-slug">{t('slug_label')}</Label>
          <div className="flex gap-2">
            <Input
              id="portfolio-slug"
              value={slugInput}
              onChange={(e) => {
                setSlugInput(sanitizePortfolioSlugInput(e.target.value))
                setSlugStatus('idle')
              }}
              placeholder="ahmed-ali"
              className="font-mono text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => void checkSlug()}>
              {t('check_availability')}
            </Button>
          </div>
          {slugStatus === 'available' && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> {t('available')}
            </p>
          )}
          {slugStatus === 'taken' && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <X className="h-3 w-3" /> {t('taken')}
            </p>
          )}
          {fullUrl && (
            <p className="text-xs text-muted-foreground break-all">
              {fullUrl}
            </p>
          )}
        </div>

        {settings.templates.length > 0 && (
          <div className="space-y-2">
            <Label>{t('template_label')}</Label>
            <p className="text-xs text-muted-foreground">{t('template_hint')}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveTemplate(null)}
                className={`rounded-lg border p-3 text-start text-sm transition ${
                  settings.portfolio_template_id === null
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <span className="font-medium">{t('template_default')}</span>
              </button>
              {settings.templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={saving}
                  onClick={() => void saveTemplate(tpl.id)}
                  className={`rounded-lg border p-3 text-start text-sm transition ${
                    settings.portfolio_template_id === tpl.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="font-medium">{isAr ? tpl.name_ar || tpl.name : tpl.name}</span>
                  {tpl.description && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {tpl.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {settings.viewStats && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('total_views')}</p>
              <p className="font-semibold num-en">{formatCount(settings.viewStats.total)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('views_this_month')}</p>
              <p className="font-semibold num-en">{formatCount(settings.viewStats.thisMonth)}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {fullUrl && settings.portfolio_is_public && (
            <>
              <Link
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('view_my_portfolio')}
              </Link>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
                {t('copy_link')}
              </Button>
            </>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <p className="font-medium">{t('whats_shown')}</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>✓ {isAr ? 'المعلومات الأساسية' : 'Basic info'}</li>
            {settings.checklist.skillsCount > 0 && (
              <li>
                ✓ {t('skills_section')} ({formatCount(settings.checklist.skillsCount)})
              </li>
            )}
            {settings.checklist.experienceCount > 0 && (
              <li>
                ✓ {t('experience_section')} ({formatCount(settings.checklist.experienceCount)})
              </li>
            )}
            {settings.checklist.educationCount > 0 && (
              <li>
                ✓ {t('education_section')} ({formatCount(settings.checklist.educationCount)})
              </li>
            )}
            {settings.checklist.projectsCount > 0 && (
              <li>
                ✓ {t('projects_section')} ({formatCount(settings.checklist.projectsCount)})
              </li>
            )}
            {settings.checklist.completedCoursesCount > 0 && (
              <li>
                ✓ {t('courses_section')} ({formatCount(settings.checklist.completedCoursesCount)})
              </li>
            )}
            {!settings.checklist.hasDefaultCv && (
              <li className="text-muted-foreground/80">
                ✗ {isAr ? 'CV للتحميل (لا يوجد CV افتراضي)' : 'CV download (no default CV)'}
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
