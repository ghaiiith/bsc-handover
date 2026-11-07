'use server'

import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { JOB_STATUS_ANSWERS, type JobStatusAnswer } from '@/lib/jobs/job-status-constants'

/**
 * Report BS-64: record the seeker's one-tap answer to the monthly "did you find
 * a job?" ping. Found-a-job / no-longer-looking flips off open-to-work (BS-61);
 * no-longer-looking also stops future pings.
 */
export async function answerJobStatus(
  answer: JobStatusAnswer
): Promise<{ success?: boolean; error?: string }> {
  if (!JOB_STATUS_ANSWERS.includes(answer)) return { error: 'invalid' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const foundOrDone =
    answer === 'found_platform' || answer === 'found_elsewhere' || answer === 'not_looking'

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({
      availability: !foundOrDone,
      job_status_ask_enabled: answer !== 'not_looking',
      job_status_last_asked_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  // Report BS-83: the monthly answer flips availability — refresh the lists that
  // cache it so the change is visible immediately.
  revalidateTag('community-members', 'max')
  revalidateTag('job-recommendations', 'max')
  return { success: true }
}
