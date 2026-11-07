import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function CtaSection() {
  const t = await getTranslations('landing.cta')
  const locale = await getLocale()
  const isRTL = locale === 'ar'
  const Arrow = isRTL ? ArrowLeft : ArrowRight

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="edu-gradient-cta relative overflow-hidden rounded-3xl px-8 py-16 text-center text-white md:px-16 md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">{t('title')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">{t('subtitle')}</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`/${locale}/register`}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'gap-2 bg-white text-foreground hover:bg-white/90'
                )}
              >
                {t('primary')}
                <Arrow className="h-4 w-4" />
              </Link>
              <Link
                href={`/${locale}/courses`}
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white'
                )}
              >
                {t('secondary')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
