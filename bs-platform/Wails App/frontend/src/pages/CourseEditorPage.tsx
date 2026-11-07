import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Unlock,
  Upload,
  Video,
} from 'lucide-react'
import { cms, invalidateCache } from '@/lib/cms'
import { api } from '@/lib/wails'
import type { CourseCurriculum, CourseListItem, CurriculumLesson, CurriculumSection } from '@/types/cms'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CourseStatusBadge, VideoStatusBadge } from '@/components/ui/badge'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { PageSkeleton } from '@/components/ui/skeleton'
import { formatBytes, formatDuration, formatDurationMinutes } from '@/lib/utils'
import { VideoProcessingPanel } from '@/components/admin/VideoProcessingPanel'
import { ContentProtectionPanel } from '@/components/admin/ContentProtectionPanel'
import { useLessonProcessingJob } from '@/hooks/useLessonProcessingJob'

type Tab = 'information' | 'curriculum' | 'lesson'

export function CourseEditorPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>(lessonId ? 'lesson' : 'curriculum')
  const [course, setCourse] = useState<CourseListItem | null>(null)
  const [curriculum, setCurriculum] = useState<CourseCurriculum | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<CurriculumLesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!courseId) return
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    try {
      const [c, cur] = await Promise.all([cms.getCourse(courseId), cms.getCurriculum(courseId)])
      setCourse(c)
      setCurriculum(cur)
      if (lessonId) {
        const found = cur.sections.flatMap((s) => s.lessons).find((l) => l.id === lessonId)
        setSelectedLesson(found ?? null)
        setTab('lesson')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => {
    void load()
  }, [load])

  const saveCourse = async () => {
    if (!course || !courseId) return
    setSaving(true)
    try {
      const updated = await cms.updateCourse(courseId, {
        title: course.title,
        title_ar: course.title_ar,
        subtitle: course.subtitle,
        subtitle_ar: course.subtitle_ar,
        description: course.description,
        description_ar: course.description_ar,
        slug: course.slug,
        category: course.category,
        level: course.level,
        language: course.language,
        price: course.price,
        discount_price: course.discount_price,
        visibility: course.visibility,
        meta_title: course.meta_title,
        meta_description: course.meta_description,
        seo_keywords: course.seo_keywords,
        learning_outcomes: course.learning_outcomes,
        target_audience: course.target_audience,
        requirements: course.requirements,
        thumbnail_url: course.thumbnail_url,
        cover_image_url: course.cover_image_url,
      })
      setCourse(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const addSection = async () => {
    if (!courseId) return
    await cms.createSection(courseId, 'New Section', 'قسم جديد')
    invalidateCache(`curriculum:${courseId}`)
    await load()
  }

  const addLesson = async (sectionId: string) => {
    if (!courseId) return
    await cms.createLesson(courseId, {
      sectionId,
      title: 'New Lesson',
      title_ar: 'درس جديد',
      duration_minutes: 0,
      is_free_preview: false,
      lesson_type: 'video',
    })
    await load()
  }

  const moveSection = async (index: number, dir: -1 | 1) => {
    if (!curriculum || !courseId) return
    const ids = curriculum.sections.map((s) => s.id)
    const target = index + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await cms.reorderSections(courseId, ids)
    await load()
  }

  const moveLesson = async (section: CurriculumSection, index: number, dir: -1 | 1) => {
    if (!courseId) return
    const ids = section.lessons.map((l) => l.id)
    const target = index + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await cms.reorderLessons(courseId, section.id, ids)
    await load()
  }

  const importVideo = async (lesson: CurriculumLesson) => {
    if (!course || !courseId) return
    const files = await api.PickVideoFiles()
    if (!files.length) return
    await api.ImportVideos({
      courseId,
      lessonId: lesson.id,
      courseTitle: course.title,
      lessonTitle: lesson.title,
      filePaths: files,
    })
    setSelectedLesson(lesson)
    setTab('lesson')
    navigate(`/courses/${courseId}/lessons/${lesson.id}`)
  }

  if (!course || !courseId) return <PageSkeleton />

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={course.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{course.instructor.full_name}</span>
            <span className="text-muted-foreground">·</span>
            <span>
              {course.total_lessons} lessons · {formatDurationMinutes(course.total_duration_minutes)} total
            </span>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CourseStatusBadge status={course.status} />
            <Button variant="outline" onClick={() => navigate('/courses')}>
              Back
            </Button>
            {tab === 'information' && (
              <Button disabled={saving} onClick={() => void saveCourse()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            )}
          </div>
        }
      />

      <div className="flex gap-2 border-b">
        {(['information', 'curriculum'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t)
              navigate(`/courses/${courseId}`)
            }}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
        {selectedLesson && (
          <button
            type="button"
            className="border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary"
          >
            {selectedLesson.title}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {tab === 'information' && (
        <Card>
          <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
            {(
              [
                ['title', 'Title (EN)'],
                ['title_ar', 'Title (AR)'],
                ['subtitle', 'Subtitle (EN)'],
                ['subtitle_ar', 'Subtitle (AR)'],
                ['slug', 'Slug'],
                ['category', 'Category'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={(course[key] as string) ?? ''}
                  onChange={(e) => setCourse({ ...course, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={course.level} onChange={(e) => setCourse({ ...course, level: e.target.value })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={course.language} onChange={(e) => setCourse({ ...course, language: e.target.value })}>
                <option value="ar">Arabic</option>
                <option value="en">English</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price (IQD)</Label>
              <Input
                type="number"
                value={course.price}
                onChange={(e) => setCourse({ ...course, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Discount price</Label>
              <Input
                type="number"
                value={course.discount_price ?? ''}
                onChange={(e) =>
                  setCourse({
                    ...course,
                    discount_price: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description (EN)</Label>
              <Textarea
                value={course.description ?? ''}
                onChange={(e) => setCourse({ ...course, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description (AR)</Label>
              <Textarea
                value={course.description_ar ?? ''}
                onChange={(e) => setCourse({ ...course, description_ar: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Thumbnail URL</Label>
              <Input
                value={course.thumbnail_url ?? ''}
                onChange={(e) => setCourse({ ...course, thumbnail_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cover image URL</Label>
              <Input
                value={course.cover_image_url ?? ''}
                onChange={(e) => setCourse({ ...course, cover_image_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>SEO Title</Label>
              <Input
                value={course.meta_title ?? ''}
                onChange={(e) => setCourse({ ...course, meta_title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>SEO Description</Label>
              <Textarea
                value={course.meta_description ?? ''}
                onChange={(e) => setCourse({ ...course, meta_description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Requirements</Label>
              <Textarea
                value={course.requirements ?? ''}
                onChange={(e) => setCourse({ ...course, requirements: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Target audience</Label>
              <Textarea
                value={course.target_audience ?? ''}
                onChange={(e) => setCourse({ ...course, target_audience: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'curriculum' && curriculum && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => void addSection()} className="gap-2">
              <Plus className="h-4 w-4" /> Add section
            </Button>
          </div>
          {curriculum.sections.map((section, sIdx) => (
            <Card key={section.id}>
              <CardContent className="pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Input
                    className="font-semibold"
                    value={section.title}
                    onChange={(e) =>
                      setCurriculum({
                        ...curriculum,
                        sections: curriculum.sections.map((s) =>
                          s.id === section.id ? { ...s, title: e.target.value } : s
                        ),
                      })
                    }
                    onBlur={() =>
                      void cms.updateSection(courseId, section.id, {
                        title: section.title,
                        title_ar: section.title_ar,
                      })
                    }
                  />
                  <Button size="icon" variant="ghost" onClick={() => void moveSection(sIdx, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => void moveSection(sIdx, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                  >
                    <ChevronDown className={`h-4 w-4 ${collapsed[section.id] ? '-rotate-90' : ''}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void cms.deleteSection(courseId, section.id).then(() => load())}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {!collapsed[section.id] && (
                  <div className="space-y-2 ps-6">
                    {section.lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3"
                      >
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 font-medium">{lesson.title}</span>
                        <VideoStatusBadge status={lesson.processing_status ?? 'none'} />
                        {lesson.is_free_preview && (
                          <span className="text-xs text-primary">Preview</span>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => void moveLesson(section, lIdx, -1)}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void moveLesson(section, lIdx, 1)}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLesson(lesson)
                            setTab('lesson')
                            navigate(`/courses/${courseId}/lessons/${lesson.id}`)
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void importVideo(lesson)}>
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => void cms.duplicateLesson(courseId, lesson.id).then(() => load())}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            void cms
                              .lessonAction(courseId, lesson.id, lesson.is_locked ? 'unlock' : 'lock')
                              .then(() => load())
                          }
                        >
                          {lesson.is_locked ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => void cms.deleteLesson(courseId, lesson.id).then(() => load())}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => void addLesson(section.id)} className="gap-2">
                      <Plus className="h-4 w-4" /> Add lesson
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'lesson' && selectedLesson && (
        <LessonPanel
          courseId={courseId}
          courseTitle={course.title}
          lesson={selectedLesson}
          onRefresh={load}
          onBack={() => {
            setTab('curriculum')
            navigate(`/courses/${courseId}`)
          }}
        />
      )}
    </div>
  )
}

function LessonPanel({
  courseId,
  courseTitle,
  lesson,
  onRefresh,
  onBack,
}: {
  courseId: string
  courseTitle: string
  lesson: CurriculumLesson
  onRefresh: (options?: { silent?: boolean }) => Promise<void>
  onBack: () => void
}) {
  const [form, setForm] = useState(lesson)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null)
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(null)
  const refreshedJobIds = useRef(new Set<string>())
  const activeJob = useLessonProcessingJob(courseId, lesson.id, trackingJobId)

  useEffect(() => {
    setForm(lesson)
  }, [lesson])

  useEffect(() => {
    if (activeJob?.status !== 'completed') return
    if (refreshedJobIds.current.has(activeJob.id)) return
    refreshedJobIds.current.add(activeJob.id)
    void onRefresh({ silent: true })
    setDismissedJobId(activeJob.id)
  }, [activeJob?.status, activeJob?.id, onRefresh])

  useEffect(() => {
    if (!activeJob?.probe) return
    if (activeJob.status === 'completed' || activeJob.status === 'failed') return
    const minutes = Math.max(1, Math.ceil(activeJob.probe.durationSeconds / 60))
    setForm((prev) => (prev.duration_minutes === minutes ? prev : { ...prev, duration_minutes: minutes }))
  }, [activeJob?.probe?.durationSeconds, activeJob?.id, activeJob?.status])

  const showProcessingPanel =
    activeJob &&
    activeJob.id !== dismissedJobId &&
    activeJob.status !== 'cancelled'

  const save = async () => {
    setSaving(true)
    try {
      await cms.updateLesson(courseId, lesson.id, {
        title: form.title,
        title_ar: form.title_ar,
        duration_minutes: form.duration_minutes,
        is_free_preview: form.is_free_preview,
        content_html: form.content_html,
        attachment_url: form.attachment_url,
      })
      await onRefresh({ silent: true })
    } finally {
      setSaving(false)
    }
  }

  const reprocess = async () => {
    const files = await api.PickVideoFiles()
    if (!files.length) return
    setImporting(true)
    setDismissedJobId(null)
    try {
      const jobs = await api.ImportVideos({
        courseId,
        lessonId: lesson.id,
        courseTitle,
        lessonTitle: lesson.title,
        filePaths: files,
      })
      if (jobs?.length) {
        setTrackingJobId(jobs[0].id)
      }
    } finally {
      setImporting(false)
    }
  }

  const asset = form.video_asset

  return (
    <div className="space-y-6">
      {showProcessingPanel && (
        <VideoProcessingPanel
          job={activeJob}
          onDismiss={() => setDismissedJobId(activeJob.id)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Lesson content</h3>
            <Button variant="outline" size="sm" onClick={onBack}>
              Back to curriculum
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Title (EN)</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Title (AR)</Label>
            <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
            />
            {activeJob?.probe && (
              <p className="text-xs text-muted-foreground">
                Detected from video:{' '}
                {Math.max(1, Math.ceil(activeJob.probe.durationSeconds / 60))} min (
                {formatDuration(activeJob.probe.durationSeconds)})
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_free_preview}
              onChange={(e) => setForm({ ...form, is_free_preview: e.target.checked })}
            />
            Free preview
          </label>
          <div className="space-y-1.5">
            <Label>Attachment URL</Label>
            <Input
              value={form.attachment_url ?? ''}
              onChange={(e) => setForm({ ...form, attachment_url: e.target.value })}
            />
          </div>
          <Button disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save lesson
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold">Video management</h3>
          <div className="flex flex-wrap gap-2">
            <VideoStatusBadge status={form.processing_status ?? 'none'} />
            <CourseStatusBadge status={form.publication_status ?? 'draft'} />
          </div>
          {asset && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">File</dt>
                <dd>{asset.original_filename ?? asset.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Size</dt>
                <dd>{asset.file_size ? formatBytes(asset.file_size) : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duration</dt>
                <dd>{asset.duration_seconds ? formatDuration(asset.duration_seconds) : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{asset.status}</dd>
              </div>
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={importing || Boolean(activeJob && !['completed', 'failed', 'cancelled'].includes(activeJob.status))}
              onClick={() => void reprocess()}
              className="gap-2"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Replace / Reprocess
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void cms.lessonAction(courseId, lesson.id, 'unlink_video').then(() => onRefresh())}
            >
              Delete video link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Reprocess runs FFmpeg → HLS → upload → publish. Progress appears above while processing.
          </p>
        </CardContent>
      </Card>
      </div>

      <ContentProtectionPanel
        courseId={courseId}
        lessonId={lesson.id}
        onReprocess={() => void reprocess()}
      />
    </div>
  )
}
