import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/seo/metadata'

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/ar/', '/en/'],
        disallow: [
          '/ar/dashboard/',
          '/en/dashboard/',
          '/ar/admin/',
          '/en/admin/',
          '/ar/cv-builder/',
          '/en/cv-builder/',
          '/ar/learn/',
          '/en/learn/',
          '/ar/login',
          '/en/login',
          '/ar/register',
          '/en/register',
          '/ar/payment/',
          '/en/payment/',
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
