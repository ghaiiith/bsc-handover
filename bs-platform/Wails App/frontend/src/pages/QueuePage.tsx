import { useCallback, useEffect, useState } from 'react'
import { Pause, Play, RefreshCw, XCircle } from 'lucide-react'
import { api, onWailsEvent } from '@/lib/wails'
import type { QueueJob } from '@/types'
import type { SystemStats } from '@/types/cms'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatBytes, formatDuration, statusColor } from '@/lib/utils'

export function QueuePage() {
  const [jobs, setJobs] = useState<QueueJob[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [system, setSystem] = useState<SystemStats | null>(null)
  const [paused, setPaused] = useState(false)

  const refresh = useCallback(async () => {
    const [list, sys] = await Promise.all([api.ListQueueJobs(), api.GetSystemStats()])
    setJobs(list ?? [])
    setSystem(sys)
  }, [])

  useEffect(() => {
    void refresh()
    const off = onWailsEvent('queue:updated', () => void refresh())
    const off2 = onWailsEvent('job:updated', () => void refresh())
    const interval = setInterval(() => void refresh(), 3000)
    return () => {
      off()
      off2()
      clearInterval(interval)
    }
  }, [refresh])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const retrySelected = () => {
    for (const id of selected) {
      const job = jobs.find((j) => j.id === id)
      if (job?.status === 'failed') void api.RetryJob(id)
    }
    setSelected(new Set())
  }

  const cancelSelected = () => {
    for (const id of selected) void api.CancelJob(id)
    setSelected(new Set())
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Processing queue"
        description={`${jobs.length} jobs`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                api.PauseQueue()
                setPaused(true)
              }}
            >
              <Pause className="h-4 w-4" /> Pause
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                api.ResumeQueue()
                setPaused(false)
              }}
            >
              <Play className="h-4 w-4" /> Resume
            </Button>
            {selected.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={retrySelected}>
                  <RefreshCw className="h-4 w-4" /> Retry failed
                </Button>
                <Button variant="destructive" size="sm" onClick={cancelSelected}>
                  Cancel selected
                </Button>
              </>
            )}
          </div>
        }
      />

      {system && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Disk used</p>
              <p className="text-xl font-bold">{system.diskUsedPct.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">
                {system.diskFreeGb.toFixed(1)} GB free
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Memory</p>
              <p className="text-xl font-bold">{system.memoryUsedMb.toFixed(0)} MB</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Queue state</p>
              <p className="text-xl font-bold capitalize">{paused ? 'Paused' : 'Running'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Active jobs</p>
              <p className="text-xl font-bold">
                {jobs.filter((j) => !['completed', 'failed', 'cancelled', 'waiting'].includes(j.status)).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {jobs.length === 0 && (
          <p className="text-sm text-muted-foreground">Queue is empty. Import videos from a lesson or Uploads.</p>
        )}
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.has(job.id)} onChange={() => toggle(job.id)} />
                  <div>
                    <p className="font-medium">{job.lessonTitle}</p>
                    <p className="text-xs text-muted-foreground">{job.courseTitle}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{job.sourcePath}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs capitalize', statusColor(job.status))}>
                    {job.status.replace(/_/g, ' ')}
                  </span>
                  {job.status === 'failed' && (
                    <Button size="icon" variant="ghost" onClick={() => api.RetryJob(job.id)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {job.status !== 'completed' && job.status !== 'cancelled' && (
                    <Button size="icon" variant="ghost" onClick={() => api.CancelJob(job.id)}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{job.error || job.message}</p>

              {job.probe && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground md:grid-cols-4">
                  <div>Resolution: {job.probe.resolution}</div>
                  <div>FPS: {job.probe.fps.toFixed(2)}</div>
                  <div>Duration: {formatDuration(job.probe.durationSeconds)}</div>
                  <div>Size: {formatBytes(job.probe.fileSize)}</div>
                </dl>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
