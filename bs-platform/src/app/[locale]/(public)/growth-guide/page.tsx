import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarCheck,
  ClipboardCheck,
  Compass,
  Download,
  Handshake,
  LineChart,
  Target,
  Trophy,
  UserRound,
  XCircle,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getPlatformSettings } from '@/lib/admin/platform-settings'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { BRAND_FULL_NAME, getBrandName } from '@/lib/brand/constants'
import LeadForm from '@/components/landing/growth-guide/LeadForm'
import LocaleToggle from '@/components/shared/LocaleToggle'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'growthGuide' })
  return buildPageMetadata({
    locale,
    path: '/growth-guide',
    title: t('meta_title'),
    description: t('meta_description'),
  })
}

/** Section 2 — the cost of doing nothing. */
const PROBLEMS = ['cashflow', 'margins', 'system', 'brand'] as const
/** Section 3 — what the guide gives back. */
const VALUE = [
  { key: 'diagnose', icon: Compass },
  { key: 'checklist', icon: ClipboardCheck },
  { key: 'roadmap', icon: Target },
  { key: 'focus', icon: BookOpenCheck },
] as const
/** Section 4 — why this guide is worth trusting. */
const AUTHORITY = [
  { key: 'consulting', icon: Trophy },
  { key: 'sales', icon: LineChart },
  { key: 'solutions', icon: Handshake },
] as const
/** Section 5 — the plan, so committing feels small. */
const STEPS = ['one', 'two', 'three'] as const

export default async function GrowthGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('growthGuide')
  const currentLocale = await getLocale()
  const isAr = currentLocale === 'ar'
  const Arrow = isAr ? ArrowLeft : ArrowRight

  const settings = await getPlatformSettings()
  const bookingUrl = settings.growth_guide_booking_url || ''
  const authorPhoto = settings.growth_guide_author_photo || ''
  const supportEmail = settings.support_email

  return (
    <div className="min-h-screen bg-background">
      {/* ── Section 1 — Header + hero (the grunt test: what, why, how) ── */}
      <header className="border-b bg-gradient-to-b from-brand-teal/5 to-transparent">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <Link href={`/${currentLocale}`} className="text-lg font-bold tracking-tight">
            {getBrandName('full', currentLocale)}
          </Link>
          <div className="flex items-center gap-2">
            {/* The visitor can switch language without leaving the page. */}
            <LocaleToggle />
            <a
              href="#lead-form"
              className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 shadow-sm')}
            >
              <Download className="h-4 w-4" />
              {t('nav_cta')}
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-14 md:py-20">
        <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1 text-xs font-medium text-brand-orange">
              <BookOpenCheck className="h-3.5 w-3.5" />
              {t('hero_badge')}
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-[1.25] tracking-tight md:text-5xl">
              {t('hero_headline')}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {t('hero_subheadline')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#lead-form"
                className={cn(buttonVariants({ size: 'lg' }), 'gap-2 text-base shadow-md')}
              >
                <Download className="h-5 w-5" />
                {t('hero_cta')}
              </a>
              <span className="text-sm text-muted-foreground">{t('hero_cta_note')}</span>
            </div>
          </div>

          {/* The visual: a 3D-style cover of the guide (no external asset needed). */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand-orange/20 via-brand-teal/10 to-transparent blur-2xl" />
            <div className="relative aspect-[3/4] rotate-[-3deg] rounded-2xl border border-white/10 bg-gradient-to-br from-brand-teal to-[#023B44] p-7 shadow-2xl transition-transform hover:rotate-0">
              <div className="flex h-full flex-col justify-between text-white">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-white/60">
                    {BRAND_FULL_NAME}
                  </p>
                  <h2 className="mt-5 text-2xl font-bold leading-snug md:text-3xl">
                    {t('cover_title')}
                  </h2>
                  <p className="mt-3 text-sm text-white/70">{t('cover_subtitle')}</p>
                </div>
                <div className="space-y-2">
                  <div className="h-1.5 w-16 rounded-full bg-brand-orange" />
                  <p className="text-xs text-white/60">{t('cover_footer')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2 — The stakes ── */}
      <section className="border-y bg-muted/30 py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-10 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-brand-orange" />
            <h2 className="text-2xl font-bold md:text-3xl">{t('problems_title')}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PROBLEMS.map((key) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-xl border bg-card p-5 shadow-sm"
              >
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold">{t(`problem_${key}_title`)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`problem_${key}_body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3 — What the guide delivers ── */}
      <section className="py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">{t('value_title')}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {VALUE.map(({ key, icon: Icon }, i) => (
              <div key={key} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="num-en text-sm font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-4 font-semibold">{t(`value_${key}_title`)}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(`value_${key}_body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4 — The guide: empathy + authority ── */}
      <section className="border-y bg-muted/30 py-16">
        <div className="container mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-[auto,1fr]">
          <div className="mx-auto">
            <div className="relative size-40 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-lg md:size-48">
              {authorPhoto ? (
                <Image src={authorPhoto} alt={t('author_name')} fill className="object-cover" sizes="192px" />
              ) : (
                <span className="flex h-full items-center justify-center">
                  <UserRound className="h-16 w-16 text-muted-foreground/50" />
                </span>
              )}
            </div>
            <p className="mt-3 text-center font-semibold">{t('author_name')}</p>
            <p className="text-center text-xs text-muted-foreground">{t('author_role')}</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold md:text-3xl">{t('guide_title')}</h2>
            <blockquote className="mt-4 border-s-4 border-brand-orange ps-4 text-lg italic leading-relaxed text-muted-foreground">
              {t('guide_empathy')}
            </blockquote>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {AUTHORITY.map(({ key, icon: Icon }) => (
                <div key={key} className="rounded-xl border bg-card p-4">
                  <Icon className="h-5 w-5 text-brand-teal" />
                  <p className="mt-2 text-sm font-semibold">{t(`authority_${key}_title`)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t(`authority_${key}_body`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5 — The 3-step plan ── */}
      <section className="py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">{t('plan_title')}</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((key, i) => (
              <li key={key} className="relative rounded-xl border bg-card p-6 shadow-sm">
                <span className="num-en flex size-10 items-center justify-center rounded-full bg-brand-teal font-bold text-white">
                  {i + 1}
                </span>
                <p className="mt-4 font-semibold">{t(`plan_${key}_title`)}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(`plan_${key}_body`)}</p>
                {i < STEPS.length - 1 && (
                  <Arrow className="absolute -end-3 top-1/2 hidden size-6 -translate-y-1/2 text-muted-foreground/30 md:block" />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Section 6 — The opt-in form ── */}
      <section id="lead-form" className="scroll-mt-8 border-y bg-brand-teal/5 py-16">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">{t('form_title')}</h2>
            <p className="mt-2 text-muted-foreground">{t('form_subtitle')}</p>
          </div>
          <LeadForm fallbackBookingUrl={bookingUrl} />
        </div>
      </section>

      {/* ── Section 7 — Secondary CTA: book the call ── */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <CalendarCheck className="mx-auto mb-4 h-10 w-10 text-brand-orange" />
          <h2 className="text-2xl font-bold md:text-3xl">{t('secondary_title')}</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            {t('secondary_body')}
          </p>
          {bookingUrl ? (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: 'lg' }), 'mt-7 gap-2 text-base shadow-md')}
            >
              <CalendarCheck className="h-5 w-5" />
              {t('cta_book_call')}
            </a>
          ) : (
            <a
              href="#lead-form"
              className={cn(buttonVariants({ size: 'lg' }), 'mt-7 gap-2 text-base shadow-md')}
            >
              <Download className="h-5 w-5" />
              {t('hero_cta')}
            </a>
          )}
        </div>
      </section>

      {/* ── Section 8 — Footer ── */}
      <footer className="border-t bg-muted/30 py-10">
        <div className="container mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href={`/${currentLocale}`} className="hover:text-foreground">
              {t('footer_about')}
            </Link>
            <Link href={`/${currentLocale}/services`} className="hover:text-foreground">
              {t('footer_services')}
            </Link>
            <a href={`mailto:${supportEmail}`} className="hover:text-foreground">
              {t('footer_contact')}
            </a>
            <Link href={`/${currentLocale}/privacy`} className="hover:text-foreground">
              {t('footer_privacy')}
            </Link>
          </nav>
          <p className="num-en">
            © {new Date().getFullYear()} {BRAND_FULL_NAME}. {t('footer_rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}
