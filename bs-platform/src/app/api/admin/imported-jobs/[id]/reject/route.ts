import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const { data: imported } = await admin
    .from('imported_jobs')
    .select('published_job_id')
    .eq('id', id)
    .single()

  if (imported?.published_job_id) {
    await admin.from('jobs').delete().eq('id', imported.published_job_id)
  }

  await admin
    .from('imported_jobs')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
    })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
