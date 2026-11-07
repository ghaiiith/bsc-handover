'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Check, ExternalLink, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ImportedJobRow {
  id: string
  raw_content: string
  source_url: string | null
  status: string
  created_at: string
  published_job_id: string | null
  ai_result: { title?: string; title_ar?: string; company_name?: string } | null
  job_sources: { name: string; type: string } | null
}

interface ImportedJobsClientProps {
  locale: string
}

export default function ImportedJobsClient({ locale }: ImportedJobsClientProps) {
  const t = useTranslations('jobScraping')
  const [fetching, setFetching] = useState(false)
  const [jobs, setJobs] = useState<ImportedJobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('reviewed')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/imported-jobs?status=${filter}`)
      const data = (await res.json()) as { jobs?: ImportedJobRow[] }
      setJobs(data.jobs ?? [])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const handlePublish = async (job: ImportedJobRow) => {
    if (!job.published_job_id) return
    const res = await fetch(`/api/admin/imported-jobs/${job.id}/publish`, {
      method: 'POST',
    })
    if (!res.ok) {
      toast.error(t('publish_error'))
      return
    }
    toast.success(t('published'))
    void load()
  }

  const handleReject = async (job: ImportedJobRow) => {
    const res = await fetch(`/api/admin/imported-jobs/${job.id}/reject`, {
      method: 'POST',
    })
    if (!res.ok) {
      toast.error(t('reject_error'))
      return
    }
    toast.success(t('rejected'))
    void load()
  }

  const handleFetchExternal = async () => {
    setFetching(true)
    try {
      const res = await fetch('/api/admin/jobs/fetch-external', { method: 'POST' })
      const data = (await res.json()) as {
        ok?: boolean
        imported?: number
        duplicates?: number
        autoPublished?: boolean
        error?: string
      }
      if (!res.ok || !data.ok) {
        toast.error(t('fetch_external_error'))
        return
      }
      toast.success(
        t('fetch_external_done', {
          imported: data.imported ?? 0,
          duplicates: data.duplicates ?? 0,
        })
      )
      await load()
    } catch {
      toast.error(t('fetch_external_error'))
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('imports_title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('imports_subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={fetching} onClick={handleFetchExternal}>
            {fetching ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {t('fetch_external')}
          </Button>
          <Link href={`/${locale}/admin/jobs/sources`}>
            <Button variant="outline" size="sm">
              {t('manage_sources')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['reviewed', 'pending', 'rejected', 'all'].map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('import_queue')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('no_imports')}</p>
          ) : (
            <ul className="space-y-4">
              {jobs.map((job) => {
                const ai = job.ai_result
                const title = ai?.title_ar ?? ai?.title ?? job.raw_content.slice(0, 80)
                return (
                  <li
                    key={job.id}
                    className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-start gap-4"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{job.status}</Badge>
                        {job.job_sources && (
                          <span className="text-xs text-muted-foreground">
                            {job.job_sources.name} ({job.job_sources.type})
                          </span>
                        )}
                      </div>
                      <p className="font-medium truncate">{title}</p>
                      {ai?.company_name && (
                        <p className="text-sm text-muted-foreground">{ai.company_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {job.raw_content}
                      </p>
                      {job.source_url && (
                        <a
                          href={job.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t('view_source')}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {job.status === 'reviewed' && job.published_job_id && (
                        <>
                          <Link href={`/${locale}/admin/jobs/${job.published_job_id}/edit`}>
                            <Button size="sm" variant="outline">
                              {t('edit_draft')}
                            </Button>
                          </Link>
                          <Button size="sm" onClick={() => void handlePublish(job)}>
                            <Check className="h-4 w-4 me-1" />
                            {t('publish')}
                          </Button>
                        </>
                      )}
                      {job.status !== 'rejected' && job.status !== 'published' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleReject(job)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
