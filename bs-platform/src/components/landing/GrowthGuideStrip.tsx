import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowLeft, ArrowRight, BookOpenCheck, Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Homepage entry point to the growth-guide landing page — a single obvious
 * place to click. Kept as its own strip so it reads as an offer, not a nav item.
 */
export default async function GrowthGuideStrip() {
  const locale = await getLocale()
  const t = await getTranslations('growthGuide')
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <section className="py-10">
      <div className="container mx-auto max-w-6xl px-4">
        <Link
          href={`/${locale}/growth-guide`}
          className="group flex flex-col items-center gap-5 rounded-3xl border border-brand-orange/30 bg-gradient-to-br from-brand-orange/10 via-card to-card p-6 transition-all hover:border-brand-orange/60 hover:shadow-lg sm:flex-row sm:p-8"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange">
            <BookOpenCheck className="size-7" />
          </span>

          <div className="min-w-0 flex-1 text-center sm:text-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
              {t('hero_badge')}
            </p>
            <h3 className="mt-1 text-lg font-bold sm:text-xl">{t('strip_title')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('strip_body')}</p>
          </div>

          <span
            className={cn(
              buttonVariants({ size: 'lg' }),
              'shrink-0 gap-2 shadow-sm transition-transform group-hover:scale-[1.02]'
            )}
          >
            <Download className="size-4" />
            {t('hero_cta')}
            <Arrow className="size-4" />
          </span>
        </Link>
      </div>
    </section>
  )
}
