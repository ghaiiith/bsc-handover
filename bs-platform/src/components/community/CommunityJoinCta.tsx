'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Copy, Sparkles, UserPlus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CommunityJoinCtaProps {
  isLoggedIn: boolean
  profileScore: number
  meetsCommunityBar: boolean
  portfolioIsPublic: boolean
  portfolioSlug?: string | null
}

export default function CommunityJoinCta({
  isLoggedIn,
  profileScore,
  meetsCommunityBar,
  portfolioIsPublic,
  portfolioSlug,
}: CommunityJoinCtaProps) {
  const t = useTranslations('community')
  const tNav = useTranslations('nav')
  const locale = useLocale()

  const isVisible = isLoggedIn && meetsCommunityBar && portfolioIsPublic

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

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="edu-gradient-cta relative overflow-hidden rounded-3xl px-6 py-12 text-center text-white md:px-12 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
          <div className="absolute -end-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -start-10 size-56 rounded-full bg-black/10 blur-2xl" />

          <div className="relative">
            {!isLoggedIn && (
              <>
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                  <UserPlus className="size-7" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('join_cta_title')}</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm text-white/90 md:text-base">
                  {t('join_cta_subtitle')}
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href={`/${locale}/register`}
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'gap-2 bg-white text-foreground hover:bg-white/90'
                    )}
                  >
                    {tNav('register')}
                  </Link>
                  <Link
                    href={`/${locale}/login`}
                    className={cn(
                      buttonVariants({ size: 'lg', variant: 'outline' }),
                      'border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white'
                    )}
                  >
                    {tNav('login')}
                  </Link>
                </div>
              </>
            )}

            {isLoggedIn && !portfolioIsPublic && (
              <>
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-white/15">
                  <Sparkles className="size-7" />
                </div>
                <h2 className="text-xl font-bold md:text-2xl">{t('not_visible_hidden')}</h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/90">{t('enable_public_hint')}</p>
                <Link
                  href={`/${locale}/dashboard/profile`}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'mt-8 gap-2 bg-white text-foreground hover:bg-white/90'
                  )}
                >
                  {t('public_settings_btn')}
                </Link>
              </>
            )}

            {isLoggedIn && portfolioIsPublic && !meetsCommunityBar && (
              <>
                <h2 className="text-xl font-bold md:text-2xl">{t('not_visible_incomplete')}</h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/90">
                  {t('profile_completion')}: {profileScore}% — {t('needs_percent')}
                </p>
                <div className="mx-auto mt-5 h-2.5 max-w-sm overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${Math.min(100, profileScore)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-white/75">{t('add_more_hint')}</p>
                <Link
                  href={`/${locale}/dashboard/profile`}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'mt-8 gap-2 bg-white text-foreground hover:bg-white/90'
                  )}
                >
                  {t('complete_profile_btn')}
                </Link>
              </>
            )}

            {isVisible && (
              <>
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-white/15">
                  <Check className="size-7" />
                </div>
                <h2 className="text-xl font-bold md:text-2xl">{t('visible_in_community')}</h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/90">{t('share_profile_hint')}</p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href={`/${locale}/community`}
                    className={cn(
                      buttonVariants({ size: 'lg', variant: 'outline' }),
                      'border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white'
                    )}
                  >
                    {t('view_in_community')}
                  </Link>
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => void copyLink()}
                    className="gap-2 bg-white text-foreground hover:bg-white/90"
                  >
                    <Copy className="size-4" />
                    {t('copy_link')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
