import {
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import type { JobStatus, QueueJob } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatBytes, formatDuration, statusColor } from '@/lib/utils'
import { api } from '@/lib/wails'

const PIPELINE_STEPS: Array<{ status: JobStatus; label: string; progressFrom: number }> = [
  { status: 'waiting_analyzing', label: 'Analyze video', progressFrom: 5 },
  { status: 'processing', label: 'Prepare source MP4', progressFrom: 15 },
  { status: 'generating_hls', label: 'Generate HLS (360–1080p)', progressFrom: 35 },
  { status: 'generating_thumbnails', label: 'Generate thumbnails', progressFrom: 55 },
  { status: 'uploading', label: 'Upload to cloud', progressFrom: 70 },
  { status: 'publishing', label: 'Publish lesson', progressFrom: 95 },
  { status: 'completed', label: 'Done', progressFrom: 100 },
]

function stepState(
  step: (typeof PIPELINE_STEPS)[number],
  job: QueueJob
): 'done' | 'active' | 'pending' | 'failed' {
  if (job.status === 'failed') {
    if (job.progress >= step.progressFrom) return 'done'
    const next = PIPELINE_STEPS.find((s) => s.progressFrom > step.progressFrom)
    if (next && job.progress >= step.progressFrom && job.progress < next.progressFrom) {
      return 'failed'
    }
    return job.progress >= step.progressFrom ? 'done' : 'pending'
  }
  if (job.status === 'completed' || job.progress >= step.progressFrom + 10) return 'done'
  if (job.status === step.status) return 'active'
  if (job.progress >= step.progressFrom) return 'done'
  return 'pending'
}

interface VideoProcessingPanelProps {
  job: QueueJob
  onDismiss?: () => void
}

export function VideoProcessingPanel({ job, onDismiss }: VideoProcessingPanelProps) {
  const isTerminal = job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
  const durationMinutes = job.probe
    ? Math.max(1, Math.ceil(job.probe.durationSeconds / 60))
    : null

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-semibold">Video processing</h4>
            <p className="text-xs text-muted-foreground truncate max-w-md">{job.sourcePath}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs capitalize font-medium', statusColor(job.status))}>
              {job.status.replace(/_/g, ' ')}
            </span>
            {job.status === 'failed' && (
              <Button size="sm" variant="outline" onClick={() => api.RetryJob(job.id)}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            )}
            {!isTerminal && (
              <Button size="sm" variant="ghost" onClick={() => api.CancelJob(job.id)}>
                Cancel
              </Button>
            )}
            {isTerminal && onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{job.message || 'Starting…'}</span>
            <span>{job.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                job.status === 'failed' ? 'bg-destructive' : 'bg-primary'
              )}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        <ol className="grid gap-2 sm:grid-cols-2">
          {PIPELINE_STEPS.map((step) => {
            const state = stepState(step, job)
            return (
              <li
                key={step.status}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-xs',
                  state === 'active' && 'border-primary bg-background',
                  state === 'done' && 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
                  state === 'failed' && 'border-destructive/40 bg-destructive/5 text-destructive',
                  state === 'pending' && 'border-transparent text-muted-foreground'
                )}
              >
                {state === 'active' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />}
                {state === 'done' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                {state === 'failed' && <XCircle className="h-3.5 w-3.5 shrink-0" />}
                {state === 'pending' && <Circle className="h-3.5 w-3.5 shrink-0 opacity-40" />}
                <span>{step.label}</span>
              </li>
            )
          })}
        </ol>

        {job.probe && (
          <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-background p-3 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground text-xs">Resolution</dt>
              <dd>{job.probe.resolution}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Frame rate</dt>
              <dd>{job.probe.fps.toFixed(1)} fps</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Duration</dt>
              <dd>{formatDuration(job.probe.durationSeconds)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">File size</dt>
              <dd>{formatBytes(job.probe.fileSize)}</dd>
            </div>
            {durationMinutes != null && (
              <div className="md:col-span-4 text-xs text-muted-foreground">
                Lesson duration will be set to{' '}
                <strong className="text-foreground">{durationMinutes} min</strong> after publish.
              </div>
            )}
          </dl>
        )}

        {job.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {job.error}
          </p>
        )}

        {job.status === 'completed' && (
          <p className="text-xs text-emerald-700">
            Video published successfully. Lesson duration and course total time have been updated.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
