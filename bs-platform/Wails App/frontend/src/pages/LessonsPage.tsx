import { useEffect, useState } from 'react'
import { Film, Upload } from 'lucide-react'
import { api } from '@/lib/wails'
import type { CourseRow, LessonRow } from '@/types'
import { cn, statusColor } from '@/lib/utils'

interface LessonsPageProps {
  course: CourseRow | null
}

export function LessonsPage({ course }: LessonsPageProps) {
  const [lessons, setLessons] = useState<LessonRow[]>([])
  const [selectedLesson, setSelectedLesson] = useState<LessonRow | null>(null)

  useEffect(() => {
    if (!course) {
      setLessons([])
      return
    }
    void api.ListLessons(course.id).then(setLessons).catch(() => setLessons([]))
  }, [course?.id])

  const importForLesson = async (lesson: LessonRow) => {
    if (!course) return
    const files = await api.PickVideoFiles()
    if (!files?.length) return
    await api.ImportVideos({
      courseId: course.id,
      lessonId: lesson.id,
      courseTitle: course.title,
      lessonTitle: lesson.title,
      filePaths: files,
    })
  }

  if (!course) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border text-zinc-500">
        Select a course from the Courses page first.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Lessons</h2>
        <p className="text-sm text-zinc-400">{course.title}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            className={cn(
              'rounded-xl border bg-card/60 p-4 transition',
              selectedLesson?.id === lesson.id ? 'border-primary' : 'border-border'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedLesson(lesson)}
                className="text-start"
              >
                <p className="font-medium">{lesson.title}</p>
                <p className="text-sm text-zinc-400">{lesson.titleAr}</p>
              </button>
              <button
                type="button"
                onClick={() => void importForLesson(lesson)}
                className="flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-1.5 text-xs text-primary hover:bg-primary/30"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-400">
              <div>
                <dt>Video</dt>
                <dd className={statusColor(lesson.assetStatus ?? 'none')}>
                  {lesson.videoAssetId ? lesson.assetStatus ?? 'linked' : 'None'}
                </dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{lesson.durationMinutes} min</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {selectedLesson && (
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Film className="h-4 w-4" />
            Lesson details
          </div>
          <p className="mt-2 font-medium">{selectedLesson.title}</p>
          <p className="text-xs text-zinc-500">ID: {selectedLesson.id}</p>
        </div>
      )}
    </div>
  )
}
