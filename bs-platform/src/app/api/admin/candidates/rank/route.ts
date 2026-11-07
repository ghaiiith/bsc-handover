import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import {
  computeRankForJob,
  getCandidateRankCacheTag,
  getRankedCandidatesForJob,
} from '@/lib/admin/candidates/rank-job-candidates'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'

const schema = z.object({
  jobId: z.string().uuid(),
  refresh: z.boolean().optional(),
})

export async function POST(request: Request) {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  try {
    if (parsed.data.refresh) {
      revalidateTag(getCandidateRankCacheTag(parsed.data.jobId), 'max')
      const result = await computeRankForJob(parsed.data.jobId)
      return NextResponse.json(result)
    }
    const result = await getRankedCandidatesForJob(parsed.data.jobId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'rank_failed'
    if (message === 'job_not_found') {
      return NextResponse.json({ error: 'job_not_found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'rank_failed' }, { status: 500 })
  }
}
