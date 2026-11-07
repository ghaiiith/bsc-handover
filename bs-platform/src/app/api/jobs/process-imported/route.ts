import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { processImportedJob, processPendingImports } from '@/lib/jobs/scraping/process-imported-job'

const bodySchema = z.object({
  importedJobId: z.string().uuid().optional(),
  processAll: z.boolean().optional(),
  limit: z.number().int().min(1).max(20).optional(),
})

export async function POST(request: Request) {
  const isInternal = isAuthorizedCronRequest(request)

  if (!isInternal && !(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const { importedJobId, processAll, limit } = parsed.data

  if (importedJobId) {
    const result = await processImportedJob(importedJobId)
    return NextResponse.json(result)
  }

  if (processAll) {
    const count = await processPendingImports(limit ?? 10)
    return NextResponse.json({ processed: count })
  }

  return NextResponse.json({ error: 'no_action' }, { status: 400 })
}
