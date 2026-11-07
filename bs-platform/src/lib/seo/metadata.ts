import type { Metadata } from 'next'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false },
}

interface PageMetadataOptions {
  title: string
  description: string
  locale: string
  path?: string
  image?: string | null
  noIndex?: boolean
}

export function buildPageMetadata({
  title,
  description,
  locale,
  path = '',
  image,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const appUrl = getAppUrl()
  const url = `${appUrl}/${locale}${path}`
  const ogImage = image ?? `${appUrl}/opengraph-image`

  return {
    title,
    description,
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    alternates: {
      canonical: url,
      languages: {
        ar: `${appUrl}/ar${path}`,
        en: `${appUrl}/en${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND_FULL_NAME,
      locale: locale === 'ar' ? 'ar_IQ' : 'en_US',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: BRAND_FULL_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export function truncateDescription(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}
