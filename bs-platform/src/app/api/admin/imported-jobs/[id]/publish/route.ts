import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'
import { revalidateJobsListingCache } from '@/lib/cache/invalidate-listing-cache'

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

  if (!imported?.published_job_id) {
    return NextResponse.json({ error: 'no_draft_job' }, { status: 400 })
  }

  await admin
    .from('jobs')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', imported.published_job_id)

  await admin
    .from('imported_jobs')
    .update({
      status: 'published',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
    })
    .eq('id', id)

  revalidateJobsListingCache()
  revalidatePath('/ar/jobs')
  revalidatePath('/en/jobs')
  revalidatePath('/ar/admin/jobs')
  revalidatePath('/en/admin/jobs')

  return NextResponse.json({ ok: true })
}
