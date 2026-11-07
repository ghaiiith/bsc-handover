import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { api } from '@/lib/wails'
import type { AppSettings, DetectResult } from '@/types'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [detected, setDetected] = useState<DetectResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void (async () => {
      const [s, d] = await Promise.all([api.GetSettings(), api.DetectFFmpeg()])
      setSettings(s)
      setDetected(d)
    })()
  }, [])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    await api.SaveSettings(settings)
    const d = await api.DetectFFmpeg()
    setDetected(d)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const field = (
    key: keyof AppSettings,
    label: string,
    type: 'text' | 'number' | 'checkbox' = 'text'
  ) => (
    <div key={key} className="space-y-1.5">
      <Label>{label}</Label>
      {type === 'checkbox' ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(settings[key])}
            onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
            className="h-4 w-4 rounded border-input"
          />
          Enabled
        </label>
      ) : (
        <Input
          type={type}
          value={String(settings[key] ?? '')}
          onChange={(e) =>
            setSettings({
              ...settings,
              [key]: type === 'number' ? Number(e.target.value) : e.target.value,
            })
          }
        />
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Connection, processing, uploads, and performance." />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <CardTitle className="text-base">General</CardTitle>
          {field('platformUrl', 'Platform URL')}
          {field('supabaseUrl', 'Supabase URL')}
          {field('supabaseAnonKey', 'Supabase anon key')}
          {field('rememberSession', 'Remember session', 'checkbox')}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <CardTitle className="text-base">FFmpeg</CardTitle>
          {detected?.found ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Detected beside executable
            </p>
          ) : (
            <p className="text-sm text-warning">Place ffmpeg.exe and ffprobe.exe next to the app.</p>
          )}
          {field('ffmpegPath', 'FFmpeg path (override)')}
          {field('ffprobePath', 'FFprobe path (override)')}
          {field('ffmpegThreads', 'FFmpeg threads (0 = auto)', 'number')}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <CardTitle className="text-base">Video processing</CardTitle>
          {field('segmentLength', 'HLS segment length (seconds)', 'number')}
          {field('thumbnailInterval', 'Thumbnail interval (seconds)', 'number')}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <CardTitle className="text-base">Uploads & storage</CardTitle>
          {field('tempDir', 'Temporary folder')}
          {field('outputDir', 'Output folder')}
          {field('uploadConcurrency', 'Upload concurrency', 'number')}
          {field('cleanupAfterUpload', 'Cleanup temp after upload', 'checkbox')}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <CardTitle className="text-base">Performance</CardTitle>
          {field('maxParallelJobs', 'Max parallel jobs', 'number')}
        </CardContent>
      </Card>

      <Button onClick={() => void save()} disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saved ? 'Saved' : 'Save settings'}
      </Button>
    </div>
  )
}
