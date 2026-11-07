import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { cms } from '@/lib/cms'
import { api } from '@/lib/wails'
import type { ActivityEntry } from '@/types'
import type { PlatformActivityItem } from '@/types/cms'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ActivityPage() {
  const [local, setLocal] = useState<ActivityEntry[]>([])
  const [platform, setPlatform] = useState<PlatformActivityItem[]>([])

  useEffect(() => {
    void (async () => {
      const [l, p] = await Promise.all([
        api.GetActivity(100),
        cms.platformActivity(50).catch(() => []),
      ])
      setLocal(l)
      setPlatform(p)
    })()
  }, [])

  const exportLogs = async () => {
    const path = await api.SaveLogExport()
    if (!path) return
    await api.ExportLogs(path)
  }

  const merged = [
    ...local.map((e) => ({
      id: e.id,
      message: e.message,
      createdAt: e.createdAt,
      type: e.level === 'error' ? 'failure' : 'local',
    })),
    ...platform.map((e) => ({
      id: e.id,
      message: e.message,
      createdAt: e.createdAt,
      type: e.type,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Activity"
        description="Uploads, publishes, edits, processing, and failures."
        actions={
          <Button variant="outline" onClick={() => void exportLogs()} className="gap-2">
            <Download className="h-4 w-4" /> Export local logs
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <ul className="divide-y">
            {merged.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">No activity yet.</li>
            )}
            {merged.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 py-3 text-sm">
                <div>
                  <span
                    className={
                      e.type === 'failure' ? 'text-destructive' : 'text-foreground'
                    }
                  >
                    {e.message}
                  </span>
                  <span className="ms-2 text-xs capitalize text-muted-foreground">{e.type}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
