import { useCallback, useEffect, useState } from 'react'
import { api, onWailsEvent } from '@/lib/wails'
import type { JobStatus, QueueJob } from '@/types'

const TERMINAL: JobStatus[] = ['completed', 'failed', 'cancelled']

function findJobForLesson(
  jobs: QueueJob[],
  courseId: string,
  lessonId: string,
  preferId?: string | null
): QueueJob | null {
  if (preferId) {
    const byId = jobs.find((job) => job.id === preferId)
    if (byId) return byId
  }

  const lessonJobs = jobs.filter(
    (job) => job.courseId === courseId && job.lessonId === lessonId
  )
  if (!lessonJobs.length) return null

  const active = lessonJobs.find((job) => !TERMINAL.includes(job.status))
  if (active) return active

  return [...lessonJobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
}

export function useLessonProcessingJob(
  courseId: string,
  lessonId: string,
  preferJobId?: string | null
) {
  const [job, setJob] = useState<QueueJob | null>(null)

  const refresh = useCallback(async () => {
    const jobs = (await api.ListQueueJobs()) ?? []
    setJob(findJobForLesson(jobs, courseId, lessonId, preferJobId))
  }, [courseId, lessonId, preferJobId])

  useEffect(() => {
    void refresh()
    const offUpdated = onWailsEvent('job:updated', () => void refresh())
    const offCompleted = onWailsEvent('job:completed', () => void refresh())
    const offFailed = onWailsEvent('job:failed', () => void refresh())
    const offQueue = onWailsEvent('queue:updated', () => void refresh())
    return () => {
      offUpdated()
      offCompleted()
      offFailed()
      offQueue()
    }
  }, [refresh])

  return job
}
