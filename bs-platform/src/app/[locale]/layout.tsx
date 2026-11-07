import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import LocaleDocumentAttributes from '@/components/shared/LocaleDocumentAttributes'
import { Toaster } from '@/components/ui/sonner'
import TrackingScripts from '@/components/tracking/TrackingScripts'
import { getPublicTrackingConfig } from '@/lib/tracking/public-config'
import PlatformChatbot from '@/components/chat/PlatformChatbot'
import { CourseCategoriesProvider } from '@/components/categories/CourseCategoriesProvider'
import { getCourseCategories } from '@/lib/admin/categories'
import BrandSplashGate from '@/components/brand/BrandSplashGate'
import {
  BRAND_FULL_NAME,
  BRAND_SHORT_NAME,
} from '@/lib/brand/constants'

export const metadata: Metadata = {
  title: { default: BRAND_FULL_NAME, template: `%s | ${BRAND_FULL_NAME}` },
  description:
    'A bilingual platform for courses, jobs, services, certificates, and professional growth.',
  applicationName: BRAND_FULL_NAME,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/logo-traced.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/logo-traced.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    siteName: BRAND_FULL_NAME,
    title: `${BRAND_FULL_NAME} — Learn, Work, and Grow`,
    description:
      'A bilingual platform for courses, jobs, services, certificates, and professional growth.',
  },
  appleWebApp: {
    capable: true,
    title: BRAND_SHORT_NAME,
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F5F7' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1220' },
  ],
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  // Enable static rendering for this locale subtree.
  setRequestLocale(locale)
  const messages = await getMessages()
  const courseCategories = await getCourseCategories()
  const isRTL = locale === 'ar'
  // Marketing: GTM / GA4 / Meta Pixel / Clarity ids, admin-managed.
  const tracking = await getPublicTrackingConfig()

  return (
    <>
      <LocaleDocumentAttributes locale={locale} />
      <TrackingScripts config={tracking} />
      <div className={isRTL ? 'font-cairo' : 'font-inter'}>
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <CourseCategoriesProvider value={courseCategories}>
              <BrandSplashGate />
              {children}
              <PlatformChatbot />
              <Toaster position={isRTL ? 'top-right' : 'top-left'} richColors />
            </CourseCategoriesProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </div>
    </>
  )
}
