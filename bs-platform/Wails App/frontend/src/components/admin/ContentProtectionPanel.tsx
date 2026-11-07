import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Shield, ShieldCheck, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/wails'
import type { StudioProtectionStatus } from '@/types/content-protection'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ContentProtectionPanelProps {
  courseId: string
  lessonId: string
  onReprocess?: () => void
}

function statusIcon(status: string) {
  if (status === 'encrypted' || status === 'protected' || status === 'healthy') {
    return <ShieldCheck className="h-4 w-4 text-emerald-600" />
  }
  if (status === 'degraded' || status === 'failed' || status === 'critical') {
    return <ShieldAlert className="h-4 w-4 text-destructive" />
  }
  return <Shield className="h-4 w-4 text-muted-foreground" />
}

export function ContentProtectionPanel({
  courseId,
  lessonId,
  onReprocess,
}: ContentProtectionPanelProps) {
  const [status, setStatus] = useState<StudioProtectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await api.CMSGetLessonProtection(courseId, lessonId)
      setStatus(JSON.parse(raw) as StudioProtectionStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load protection status')
    } finally {
      setLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => {
    void load()
  }, [load])

  const validate = async () => {
    setValidating(true)
    setError(null)
    try {
      const raw = await api.CMSValidateLessonProtection(courseId, lessonId)
      setStatus(JSON.parse(raw) as StudioProtectionStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setValidating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Content protection</h3>
          <Button variant="outline" size="sm" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {status && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg border p-3">
              {statusIcon(status.encryptionStatus)}
              <div>
                <dt className="text-xs text-muted-foreground">Encryption</dt>
                <dd className="capitalize font-medium">{status.encryptionStatus}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              {statusIcon(status.protectionStatus)}
              <div>
                <dt className="text-xs text-muted-foreground">Protection</dt>
                <dd className="capitalize font-medium">{status.protectionStatus}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              {statusIcon(status.assetHealth)}
              <div>
                <dt className="text-xs text-muted-foreground">Asset health</dt>
                <dd className="capitalize font-medium">{status.assetHealth}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              {statusIcon(status.keyRegistered ? 'encrypted' : 'none')}
              <div>
                <dt className="text-xs text-muted-foreground">Key status</dt>
                <dd className="font-medium">{status.keyRegistered ? 'Registered (server)' : 'Not registered'}</dd>
              </div>
            </div>
            <div className="sm:col-span-2 text-xs text-muted-foreground">
              Encryption v{status.encryptionVersion} · Processing v{status.processingVersion}
              {status.lastValidationAt && (
                <> · Last validation {new Date(status.lastValidationAt).toLocaleString()}</>
              )}
            </div>
          </dl>
        )}

        {status?.assetHealthDetails?.issues?.length ? (
          <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {status.assetHealthDetails.issues.map((issue) => (
              <li key={issue}>• {issue}</li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={validating} onClick={() => void validate()} className="gap-2">
            {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
            Validate lesson
          </Button>
          {onReprocess && (
            <Button size="sm" variant="outline" onClick={onReprocess} className="gap-2">
              Re-encrypt / Rebuild HLS
            </Button>
          )}
        </div>

        <p className={cn('text-xs text-muted-foreground')}>
          Keys are stored server-side only. R2 holds encrypted segments. Playback requires an active session.
        </p>
      </CardContent>
    </Card>
  )
}
