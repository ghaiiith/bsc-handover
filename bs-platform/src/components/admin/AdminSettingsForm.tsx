'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import Image from 'next/image'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import {
  updateMaintenanceMode,
  updatePlatformInfo,
  updateServiceRevenueNotice,
  updateCvDailyAllowance,
  updateAiProFeatures,
  grantUserPro,
  addFeaturedCourse,
  removeFeaturedCourse,
  searchPublishedCourses,
} from '@/lib/admin/admin-settings-actions'
import type { PlatformSettings } from '@/lib/admin/platform-settings'

interface FeaturedCourse {
  id: string
  title: string
  title_ar: string
  thumbnail_url?: string
}

interface AdminSettingsFormProps {
  locale: string
  settings: PlatformSettings
  featuredCourses: FeaturedCourse[]
}

export default function AdminSettingsForm({
  locale,
  settings,
  featuredCourses: initialFeatured,
}: AdminSettingsFormProps) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [maintenance, setMaintenance] = useState(settings.maintenance_mode === 'true')
  const [supportEmail, setSupportEmail] = useState(settings.support_email)
  const [platformName, setPlatformName] = useState(settings.platform_name)
  const [cvAllowance, setCvAllowance] = useState(settings.cv_daily_allowance)
  const [proFeatures, setProFeatures] = useState<string[]>(() => {
    try {
      const a = JSON.parse(settings.ai_pro_features || '[]')
      return Array.isArray(a) ? a : []
    } catch {
      return []
    }
  })
  const [proEmail, setProEmail] = useState('')
  const [proMonths, setProMonths] = useState('12')
  const [noticeAr, setNoticeAr] = useState(settings.service_revenue_notice_ar)
  const [noticeEn, setNoticeEn] = useState(settings.service_revenue_notice_en)
  const [featuredCourses, setFeaturedCourses] = useState(initialFeatured)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<FeaturedCourse[]>([])
  const isAr = locale === 'ar'

  const run = (
    fn: () => Promise<{ success?: boolean; error?: string }>,
    successMsg: string,
    onDone?: () => void
  ) => {
    startTransition(async () => {
      const result = await fn()
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(successMsg)
      onDone?.()
      router.refresh()
    })
  }

  const handleSearch = async () => {
    const results = await searchPublishedCourses(searchQ)
    setSearchResults(results as FeaturedCourse[])
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('revenue_commission')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('revenue_commission_hint')}</p>
          <Link
            href={`/${locale}/admin/revenue-commission`}
            className={buttonVariants({ variant: 'outline' })}
          >
            {t('manage_revenue')}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('featured_courses')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {featuredCourses.map((course) => (
            <div key={course.id} className="flex items-center gap-3 border rounded-lg p-2">
              <div className="relative h-10 w-16 rounded bg-muted overflow-hidden shrink-0">
                {course.thumbnail_url && (
                  <Image src={course.thumbnail_url} alt="" fill className="object-cover" sizes="64px" />
                )}
              </div>
              <span className="text-sm flex-1 line-clamp-1">
                {isAr ? course.title_ar : course.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => removeFeaturedCourse(course.id, locale),
                    t('settings_saved'),
                    () =>
                      setFeaturedCourses((prev) => prev.filter((c) => c.id !== course.id))
                  )
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            disabled={featuredCourses.length >= 6}
            onClick={() => setSearchOpen(true)}
          >
            {t('add_featured_course')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('maintenance_mode')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{t('maintenance_mode')}</Label>
            <Switch
              checked={maintenance}
              disabled={isPending}
              onCheckedChange={(checked) => {
                setMaintenance(checked)
                run(
                  () => updateMaintenanceMode(checked, locale),
                  t('settings_saved')
                )
              }}
            />
          </div>
          <p className="text-xs text-destructive">{t('maintenance_warning')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('platform_info')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('support_email')}</Label>
            <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('platform_name')}</Label>
            <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
          </div>
          <Button
            disabled={isPending}
            onClick={() =>
              run(
                () =>
                  updatePlatformInfo(
                    { support_email: supportEmail, platform_name: platformName },
                    locale
                  ),
                t('settings_saved')
              )
            }
          >
            {tCommon('save')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('cv_daily_allowance')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('cv_daily_allowance_hint')}</p>
          <Input
            type="number"
            min={0}
            max={100}
            className="num-en max-w-[140px]"
            value={cvAllowance}
            onChange={(e) => setCvAllowance(e.target.value)}
          />
          <Button
            disabled={isPending}
            onClick={() =>
              run(
                () => updateCvDailyAllowance(parseInt(cvAllowance || '0', 10), locale),
                t('settings_saved')
              )
            }
          >
            {tCommon('save')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('ai_pro_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('ai_pro_hint')}</p>
          {(['ai_cv', 'ai_course', 'ai_matching'] as const).map((key) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t(`ai_pro_${key}`)}</p>
                <p className="text-xs text-muted-foreground">{t(`ai_pro_${key}_desc`)}</p>
              </div>
              <Switch
                checked={proFeatures.includes(key)}
                disabled={isPending}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...proFeatures, key]
                    : proFeatures.filter((f) => f !== key)
                  setProFeatures(next)
                  run(() => updateAiProFeatures(next, locale), t('settings_saved'))
                }}
              />
            </div>
          ))}

          <div className="space-y-2 border-t pt-4">
            <Label>{t('ai_pro_grant')}</Label>
            <p className="text-xs text-muted-foreground">{t('ai_pro_grant_hint')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                placeholder={t('ai_pro_grant_email')}
                value={proEmail}
                onChange={(e) => setProEmail(e.target.value)}
                className="max-w-xs"
              />
              <Input
                type="number"
                min={0}
                max={60}
                className="num-en w-24"
                value={proMonths}
                onChange={(e) => setProMonths(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={isPending || !proEmail.trim()}
                onClick={() =>
                  run(
                    () => grantUserPro(proEmail.trim(), parseInt(proMonths || '0', 10), locale),
                    t('ai_pro_granted')
                  )
                }
              >
                {t('ai_pro_grant_btn')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('service_revenue_notice')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('service_revenue_notice_hint')}</p>
          <div className="space-y-2">
            <Label>{t('service_revenue_notice_ar')}</Label>
            <Textarea value={noticeAr} onChange={(e) => setNoticeAr(e.target.value)} rows={3} dir="rtl" />
          </div>
          <div className="space-y-2">
            <Label>{t('service_revenue_notice_en')}</Label>
            <Textarea value={noticeEn} onChange={(e) => setNoticeEn(e.target.value)} rows={3} />
          </div>
          <Button
            disabled={isPending}
            onClick={() =>
              run(
                () => updateServiceRevenueNotice({ ar: noticeAr, en: noticeEn }, locale),
                t('settings_saved')
              )
            }
          >
            {tCommon('save')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_featured_course')}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder={t('search_courses')}
            />
            <Button onClick={handleSearch}>{tCommon('search')}</Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searchResults.map((course) => (
              <button
                key={course.id}
                type="button"
                className="w-full text-start p-2 rounded hover:bg-muted text-sm"
                onClick={() => {
                  run(
                    () => addFeaturedCourse(course.id, locale),
                    t('settings_saved')
                  )
                  setFeaturedCourses((prev) => [...prev, course])
                  setSearchOpen(false)
                }}
              >
                {isAr ? course.title_ar : course.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
