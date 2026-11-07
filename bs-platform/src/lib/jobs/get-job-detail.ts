import { createClient } from '@/lib/supabase/server'
import type { Job } from '@/types'

export interface JobDetailData {
  job: Job
  isAdmin: boolean
}

export async function getJobDetail(jobId: string): Promise<JobDetailData | null> {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    return null
  }

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id

  let userRole: string | undefined
  if (userId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    userRole = profile?.role
  }

  const isAdmin = userRole === 'admin'
  const jobData = job as Job

  if (jobData.status !== 'active' && !isAdmin) {
    return null
  }

  return {
    job: jobData,
    isAdmin,
  }
}
