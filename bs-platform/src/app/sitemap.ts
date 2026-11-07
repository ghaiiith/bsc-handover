import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/seo/metadata'

const LOCALES = ['ar', 'en'] as const

const STATIC_PATHS = ['', '/courses', '/jobs', '/services'] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl()
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${appUrl}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === '' ? 'weekly' : 'daily',
        priority: path === '' ? 1 : 0.8,
      })
    }
  }

  try {
    const admin = createAdminClient()

    const [{ data: courses }, { data: jobs }, { data: services }] = await Promise.all([
      admin.from('courses').select('id, updated_at').eq('status', 'published'),
      admin.from('jobs').select('id, updated_at').eq('status', 'active'),
      admin.from('services').select('id, updated_at').eq('status', 'active'),
    ])

    for (const locale of LOCALES) {
      for (const course of courses ?? []) {
        entries.push({
          url: `${appUrl}/${locale}/courses/${course.id}`,
          lastModified: course.updated_at ? new Date(course.updated_at) : now,
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }

      for (const job of jobs ?? []) {
        entries.push({
          url: `${appUrl}/${locale}/jobs/${job.id}`,
          lastModified: job.updated_at ? new Date(job.updated_at) : now,
          changeFrequency: 'daily',
          priority: 0.6,
        })
      }

      for (const service of services ?? []) {
        entries.push({
          url: `${appUrl}/${locale}/services/${service.id}`,
          lastModified: service.updated_at ? new Date(service.updated_at) : now,
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      }
    }
  } catch (error) {
    console.error('[sitemap] Failed to fetch dynamic routes:', error)
  }

  return entries
}
