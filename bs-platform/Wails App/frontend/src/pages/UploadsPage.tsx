import { useState } from 'react'
import { FolderOpen, Upload } from 'lucide-react'
import { api } from '@/lib/wails'
import type { CourseRow, LessonRow, VideoProbe } from '@/types'
import { formatBytes, formatDuration } from '@/lib/utils'

interface UploadsPageProps {
  course: CourseRow | null
  lesson: LessonRow | null
}

export function UploadsPage({ course, lesson }: UploadsPageProps) {
  const [probe, setProbe] = useState<VideoProbe | null>(null)
  const [lastPath, setLastPath] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const pickFiles = async () => {
    const files = await api.PickVideoFiles()
    if (!files?.length) return
    setLastPath(files[0])
    const p = await api.ProbeVideo(files[0])
    setProbe(p)
  }

  const pickFolder = async () => {
    const folder = await api.PickVideoFolder()
    if (!folder) return
    setMessage(`Selected folder: ${folder}`)
  }

  const enqueue = async () => {
    if (!course || !lesson || !lastPath) {
      setMessage('Select a course, lesson, and video file first.')
      return
    }
    await api.ImportVideos({
      courseId: course.id,
      lessonId: lesson.id,
      courseTitle: course.title,
      lessonTitle: lesson.title,
      filePaths: [lastPath],
    })
    setMessage('Video queued for processing.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Import Video</h2>
        <p className="text-sm text-zinc-400">Browse, drag-drop path, or import a folder</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void pickFiles()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium"
        >
          <Upload className="h-4 w-4" /> Browse File
        </button>
        <button
          type="button"
          onClick={() => void pickFolder()}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"
        >
          <FolderOpen className="h-4 w-4" /> Folder Import
        </button>
        <button
          type="button"
          onClick={() => void enqueue()}
          disabled={!course || !lesson || !lastPath}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400 disabled:opacity-40"
        >
          Queue for Processing
        </button>
      </div>

      {message && <p className="text-sm text-zinc-400">{message}</p>}

      {lastPath && (
        <p className="truncate text-xs text-zinc-500">{lastPath}</p>
      )}

      {probe && (
        <div className="rounded-xl border border-border bg-card/60 p-5">
          <h3 className="font-medium">Video Analysis (FFprobe)</h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div><dt className="text-zinc-500">Resolution</dt><dd>{probe.resolution}</dd></div>
            <div><dt className="text-zinc-500">FPS</dt><dd>{probe.fps.toFixed(2)}</dd></div>
            <div><dt className="text-zinc-500">Duration</dt><dd>{formatDuration(probe.durationSeconds)}</dd></div>
            <div><dt className="text-zinc-500">Video Codec</dt><dd>{probe.videoCodec}</dd></div>
            <div><dt className="text-zinc-500">Audio Codec</dt><dd>{probe.audioCodec}</dd></div>
            <div><dt className="text-zinc-500">Bitrate</dt><dd>{Math.round(probe.bitrate / 1000)} kbps</dd></div>
            <div><dt className="text-zinc-500">File Size</dt><dd>{formatBytes(probe.fileSize)}</dd></div>
            <div><dt className="text-zinc-500">Aspect Ratio</dt><dd>{probe.aspectRatio}</dd></div>
            <div><dt className="text-zinc-500">Container</dt><dd>{probe.containerFormat}</dd></div>
          </dl>
        </div>
      )}
    </div>
  )
}
