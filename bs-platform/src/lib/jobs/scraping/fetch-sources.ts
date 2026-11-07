import 'server-only'

import { assertPublicHttpUrl } from '@/lib/security/ssrf'
import type { ScrapedJobItem } from '@/types/job-scraping'

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = block.match(re)
  return match ? stripCdata(match[1].replace(/<[^>]+>/g, ' ')).trim() : ''
}

export async function fetchRssItems(feedUrl: string): Promise<ScrapedJobItem[]> {
  // SSRF guard: feed URL is admin-supplied and fetched server-side.
  if (!(await assertPublicHttpUrl(feedUrl))) {
    throw new Error('RSS fetch blocked: unsafe feed URL')
  }

  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Business-Skills-JobBot/1.0' },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`RSS fetch failed: ${res.status}`)
  }

  const xml = await res.text()
  const items: ScrapedJobItem[] = []

  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? []

  for (const block of itemBlocks) {
    const title = extractTag(block, 'title')
    const description = extractTag(block, 'description')
    const link = extractTag(block, 'link')
    const guid = extractTag(block, 'guid') || link

    const raw = [title, description].filter(Boolean).join('\n\n')
    if (raw.length < 50) continue

    items.push({
      raw_content: raw,
      source_url: link || undefined,
      source_post_id: guid ? guid.slice(0, 200) : undefined,
    })
  }

  return items
}

export async function fetchLinkedInJobs(config: {
  search_query: string
  location?: string
  job_type?: string
}): Promise<ScrapedJobItem[]> {
  const apiKey = process.env.RAPIDAPI_KEY?.trim()
  const host = process.env.RAPIDAPI_HOST?.trim() || 'linkedin-jobs-search.p.rapidapi.com'

  if (!apiKey || apiKey.startsWith('your_')) {
    console.warn('[linkedin] RAPIDAPI_KEY not configured — skipping LinkedIn fetch')
    return []
  }

  const params = new URLSearchParams({
    query: config.search_query,
    location: config.location ?? 'Iraq',
    datePosted: 'past24Hours',
  })

  const res = await fetch(`https://${host}/search?${params}`, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': host,
    },
  })

  if (!res.ok) {
    throw new Error(`LinkedIn API failed: ${res.status}`)
  }

  const data = (await res.json()) as {
    jobs?: Array<{
      id?: string
      title?: string
      company?: string
      location?: string
      description?: string
      url?: string
    }>
  }

  const jobs = data.jobs ?? []

  return jobs
    .map((job) => {
      const raw = [
        job.title,
        job.company ? `Company: ${job.company}` : '',
        job.location ? `Location: ${job.location}` : '',
        job.description,
      ]
        .filter(Boolean)
        .join('\n\n')

      if (raw.length < 50) return null

      return {
        raw_content: raw,
        source_url: job.url,
        source_post_id: job.id ? `linkedin-${job.id}` : undefined,
      } satisfies ScrapedJobItem
    })
    .filter(Boolean) as ScrapedJobItem[]
}
