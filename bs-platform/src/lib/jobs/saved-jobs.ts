'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface SavedJobItem {
  id: string
  created_at: string
  job: {
    id: string
    title: string
    title_ar: string | null
    company_name: string | null
    city: string | null
    job_type: string | null
    status: string | null
  } | null
}

export async function toggleSavedJob(
  jobId: string,
  locale: string
): Promise<{ success: boolean; saved: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, saved: false, error: 'not_authenticated' }

  const { data: existing } = await supabase
    .from('saved_jobs')
    .select('id')
    .eq('user_id', user.id)
    .eq('job_id', jobId)
    .maybeSingle()

  if (existing) {
    await supabase.from('saved_jobs').delete().eq('id', existing.id)
    revalidatePath(`/${locale}/dashboard/saved-jobs`)
    return { success: true, saved: false }
  }

  const { error } = await supabase
    .from('saved_jobs')
    .insert({ user_id: user.id, job_id: jobId })
  if (error) return { success: false, saved: false, error: error.message }

  revalidatePath(`/${locale}/dashboard/saved-jobs`)
  return { success: true, saved: true }
}

export async function isJobSaved(jobId: string): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('saved_jobs')
    .select('id')
    .eq('user_id', user.id)
    .eq('job_id', jobId)
    .maybeSingle()
  return Boolean(data)
}

export async function getSavedJobs(userId: string): Promise<SavedJobItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('saved_jobs')
    .select('id, created_at, job:jobs(id, title, title_ar, company_name, city, job_type, status)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return ((data ?? []) as unknown as SavedJobItem[]).map((row) => ({
    ...row,
    job: Array.isArray(row.job) ? row.job[0] ?? null : row.job,
  }))
}
