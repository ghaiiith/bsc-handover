import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import Navbar from '@/components/shared/Navbar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileQuestion, Home } from 'lucide-react'

export default async function NotFoundPage() {
  const locale = await getLocale()
  const t = await getTranslations('errors')

  const links = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/courses`, label: t('courses') },
    { href: `/${locale}/jobs`, label: t('jobs') },
    { href: `/${locale}/services`, label: t('services') },
  ]

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-20 flex flex-col items-center text-center max-w-lg">
        <div className="rounded-full bg-muted p-6 mb-6">
          <FileQuestion className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-3">{t('not_found_title')}</h2>
        <p className="text-muted-foreground mb-8">{t('not_found_desc')}</p>
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <Link
          href={`/${locale}`}
          className={cn(buttonVariants(), 'gap-2')}
        >
          <Home className="h-4 w-4" />
          {t('back_home')}
        </Link>
      </div>
    </div>
  )
}
