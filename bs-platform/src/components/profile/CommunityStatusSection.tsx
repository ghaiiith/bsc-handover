'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Check, AlertTriangle, EyeOff, Copy } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import CommunityVisibilitySwitch from '@/components/profile/CommunityVisibilitySwitch'
import { toast } from 'sonner'

interface CommunityStatusSectionProps {
  profileScore: number
  meetsCommunityBar: boolean
  portfolioIsPublic: boolean
  portfolioSlug?: string | null
}

export default function CommunityStatusSection({
  profileScore,
  meetsCommunityBar,
  portfolioIsPublic,
  portfolioSlug,
}: CommunityStatusSectionProps) {
  const t = useTranslations('community')
  const locale = useLocale()

  const copyLink = async () => {
    if (!portfolioSlug) return
    const url = `${window.location.origin}/${locale}/portfolio/${portfolioSlug}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('link_copied'))
    } catch {
      toast.error(t('link_copy_failed'))
    }
  }

  if (!portfolioIsPublic) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <EyeOff className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="font-semibold">{t('not_visible_hidden')}</h2>
            <p className="text-sm text-muted-foreground">{t('enable_public_hint')}</p>
            <Link href="#portfolio-settings" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              {t('public_settings_btn')}
            </Link>
            {/* Report BS-67: explicit opt-in/out switch. */}
            <CommunityVisibilitySwitch initial={false} />
          </div>
        </div>
      </section>
    )
  }

  if (!meetsCommunityBar) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-3 flex-1">
            <h2 className="font-semibold">{t('not_visible_incomplete')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('profile_completion')}: {profileScore}% — {t('needs_percent')}
            </p>
            <div className="h-2 max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, profileScore)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('add_more_hint')}</p>
            {/* Report BS-67: the switch is available even before the threshold. */}
            <CommunityVisibilitySwitch initial={true} />
            <Link href={`/${locale}/dashboard/profile`} className={buttonVariants({ size: 'sm' })}>
              {t('complete_profile_btn')}
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-green-200 bg-green-50/50 dark:bg-green-950/20 p-6">
      <div className="flex items-start gap-3">
        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        <div className="space-y-3 flex-1">
          <h2 className="font-semibold text-green-800 dark:text-green-200">
            {t('visible_in_community')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('share_profile_hint')}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/community`}
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              {t('view_in_community')}
            </Link>
            <Button type="button" size="sm" className="gap-2" onClick={() => void copyLink()}>
              <Copy className="h-4 w-4" />
              {t('copy_link')}
            </Button>
          </div>
          {/* Report BS-67: on by default once visible — this is the opt-out. */}
          <CommunityVisibilitySwitch initial={true} />
        </div>
      </div>
    </section>
  )
}
