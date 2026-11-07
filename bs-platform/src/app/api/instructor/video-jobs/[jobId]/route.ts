import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProcessingJob } from '@/lib/video/processing-jobs'

export const runtime = 'nodejs'

/** Poll a transcode job's progress. RLS-readable by its creator or an admin. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const job = await getProcessingJob(jobId)
  if (!job) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const isAdmin = profile?.role === 'admin'

  // The worker enqueues with created_by; only the creator or an admin may poll.
  const { data: owned } = await supabase
    .from('video_processing_jobs')
    .select('id')
    .eq('id', jobId)
    .maybeSingle()
  if (!owned && !isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    error: job.error,
    renditions: job.renditions,
    durationSeconds: job.duration_seconds,
  })
}
