import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'

export async function GET(request: Request) {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'reviewed'

  const admin = createAdminClient()
  let query = admin
    .from('imported_jobs')
    .select(`
      *,
      job_sources(name, type)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ jobs: data ?? [] })
}
