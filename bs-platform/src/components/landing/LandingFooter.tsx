import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Share2, Globe, Mail } from 'lucide-react'
import BrandLogo from '@/components/brand/BrandLogo'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'

export default async function LandingFooter() {
  const t = await getTranslations('landing.footer')
  const locale = await getLocale()
  const year = new Date().getFullYear()

  const columns = [
    {
      title: t('platform'),
      links: [
        { label: t('links.about'), href: `/${locale}#about` },
        { label: t('links.features'), href: `/${locale}#features` },
        { label: t('links.ecosystem'), href: `/${locale}#ecosystem` },
      ],
    },
    {
      title: t('courses'),
      links: [
        { label: t('links.browse_courses'), href: `/${locale}/courses` },
        { label: t('links.instructors'), href: `/${locale}#instructors` },
      ],
    },
    {
      title: t('jobs'),
      links: [
        { label: t('links.browse_jobs'), href: `/${locale}/jobs` },
        { label: t('links.companies'), href: `/${locale}#companies` },
      ],
    },
    {
      title: t('services'),
      links: [{ label: t('links.browse_services'), href: `/${locale}/services` }],
    },
    {
      title: t('community'),
      links: [{ label: t('links.community'), href: `/${locale}#community` }],
    },
    {
      title: t('legal'),
      links: [
        { label: t('links.privacy'), href: `/${locale}/privacy` },
        { label: t('links.terms'), href: `/${locale}/terms` },
      ],
    },
  ]

  return (
    <footer id="about" className="border-t bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-7 lg:gap-10">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <BrandLogo
              href={`/${locale}`}
              locale={locale}
              orientation="horizontal"
              mode="full"
              className="shrink-0"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t('tagline')}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Share2, Globe, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>
            © <span className="num-en">{year}</span> {BRAND_FULL_NAME}. {t('rights')}
          </p>
          <p>{t('made_with')}</p>
        </div>
      </div>
    </footer>
  )
}
