'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import VideoUpload from '@/components/courses/VideoUpload'
import {
  createLesson,
  createSection,
  deleteLesson,
  deleteSection,
  finalizeCurriculumStep,
  getCourseWizardSections,
  updateLesson,
} from '@/lib/instructor/course-wizard-actions'
import type { SectionWithLessons } from '@/lib/courses/lesson-utils'
import type { Lesson } from '@/types'
import { Textarea } from '@/components/ui/textarea'
import type { AiQuizQuestion } from '@/types/course-ai'
import { toast } from 'sonner'

interface Step3CurriculumProps {
  locale: string
  courseId: string
  initialSections: SectionWithLessons[]
  courseTitle?: string
  courseLevel?: string
  onComplete?: () => void
  onBack?: () => void
  standalone?: boolean
}

interface LessonDraft {
  title: string
  title_ar: string
  duration_minutes: number
  is_free_preview: boolean
  video_asset_id: string
  description_ar: string
  description_en: string
}

const emptyLesson = (): LessonDraft => ({
  title: '',
  title_ar: '',
  duration_minutes: 5,
  is_free_preview: false,
  video_asset_id: '',
  description_ar: '',
  description_en: '',
})

export default function Step3Curriculum({
  locale,
  courseId,
  initialSections,
  courseTitle = '',
  courseLevel = 'beginner',
  onComplete,
  onBack,
  standalone = false,
}: Step3CurriculumProps) {
  const t = useTranslations('instructor')
  const tAi = useTranslations('courseAi')
  const isAr = locale === 'ar'
  const [aiLessonLoading, setAiLessonLoading] = useState(false)
  const [quizPreview, setQuizPreview] = useState<AiQuizQuestion[] | null>(null)
  const [sections, setSections] = useState(initialSections)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    initialSections[0]?.id ?? null
  )
  const [loading, setLoading] = useState(false)
  const [sectionForm, setSectionForm] = useState({ title: '', title_ar: '' })
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [lessonDraft, setLessonDraft] = useState<LessonDraft>(emptyLesson())
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  // Stable id for a not-yet-created lesson so its video object key is fixed.
  const [draftLessonId, setDraftLessonId] = useState<string>(() =>
    crypto.randomUUID()
  )

  const refreshSections = useCallback(async () => {
    const result = await getCourseWizardSections(courseId)
    if (!result.error) {
      setSections(result.sections)
      setSelectedSectionId((prev) => {
        if (prev && result.sections.some((section) => section.id === prev)) {
          return prev
        }
        return result.sections[0]?.id ?? null
      })
    }
  }, [courseId])

  useEffect(() => {
    void refreshSections()
  }, [courseId, refreshSections])

  const selectedSection = sections.find((s) => s.id === selectedSectionId)

  const handleAddSection = async () => {
    if (!sectionForm.title.trim() || !sectionForm.title_ar.trim()) {
      toast.error(t('section_titles_required'))
      return
    }
    if (sectionForm.title.trim().length < 2 || sectionForm.title_ar.trim().length < 2) {
      toast.error(t('section_title_min'))
      return
    }

    setLoading(true)
    const result = await createSection(courseId, sectionForm, locale)
    setLoading(false)
    if (!result.success) {
      toast.error(
        result.error === 'validation_failed'
          ? t('section_title_min')
          : t('save_error')
      )
      return
    }
    setSectionForm({ title: '', title_ar: '' })
    setShowSectionForm(false)
    await refreshSections()
    if (result.sectionId) setSelectedSectionId(result.sectionId)
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm(t('confirm_delete_section'))) return
    setLoading(true)
    await deleteSection(sectionId, courseId, locale)
    setLoading(false)
    if (selectedSectionId === sectionId) setSelectedSectionId(null)
    await refreshSections()
  }

  const handleSaveLesson = async () => {
    if (!selectedSectionId) {
      toast.error(t('select_section'))
      return
    }
    if (!lessonDraft.title.trim() || !lessonDraft.title_ar.trim()) {
      toast.error(t('lesson_titles_required'))
      return
    }

    setLoading(true)

    const contentHtml =
      lessonDraft.description_ar || lessonDraft.description_en
        ? JSON.stringify({
            description_ar: lessonDraft.description_ar,
            description_en: lessonDraft.description_en,
          })
        : undefined

    const payload = {
      title: lessonDraft.title,
      title_ar: lessonDraft.title_ar,
      duration_minutes: lessonDraft.duration_minutes,
      is_free_preview: lessonDraft.is_free_preview,
      video_asset_id: lessonDraft.video_asset_id || undefined,
      content_html: contentHtml,
    }

    const result = editingLesson
      ? await updateLesson(editingLesson.id, courseId, payload, locale)
      : await createLesson(selectedSectionId, courseId, payload, locale, draftLessonId)

    setLoading(false)
    if (!result.success) {
      toast.error(
        result.error === 'validation_failed'
          ? t('lesson_title_min')
          : t('save_error')
      )
      return
    }

    setLessonDraft(emptyLesson())
    setEditingLesson(null)
    setDraftLessonId(crypto.randomUUID())
    await refreshSections()
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm(t('confirm_delete_lesson'))) return
    setLoading(true)
    await deleteLesson(lessonId, courseId, locale)
    setLoading(false)
    await refreshSections()
  }

  const handleNext = async () => {
    setLoading(true)
    const result = await finalizeCurriculumStep(courseId, locale)
    setLoading(false)
    if (!result.success) {
      toast.error(t('save_error'))
      return
    }
    onComplete?.()
  }

  const startEditLesson = (lesson: Lesson) => {
    let description_ar = ''
    let description_en = ''
    if (lesson.content_html) {
      try {
        const parsed = JSON.parse(lesson.content_html) as {
          description_ar?: string
          description_en?: string
        }
        description_ar = parsed.description_ar ?? ''
        description_en = parsed.description_en ?? ''
      } catch {
        description_ar = lesson.content_html
      }
    }
    setEditingLesson(lesson)
    setLessonDraft({
      title: lesson.title,
      title_ar: lesson.title_ar,
      duration_minutes: lesson.duration_minutes,
      is_free_preview: lesson.is_free_preview,
      video_asset_id: lesson.video_asset_id ?? '',
      description_ar,
      description_en,
    })
    setQuizPreview(null)
  }

  const handleImproveLesson = async () => {
    if (!selectedSection) return
    setAiLessonLoading(true)
    try {
      const res = await fetch('/api/instructor/ai/improve-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lessonDraft.title_ar,
          lessonTitleEn: lessonDraft.title,
          currentDescription: lessonDraft.description_ar || lessonDraft.description_en,
          sectionTitle: selectedSection.title_ar,
          courseTitle,
          level: courseLevel,
        }),
      })
      if (!res.ok) {
        toast.error(tAi('lesson_improve_error'))
        return
      }
      const data = (await res.json()) as { description_ar: string; description_en: string }
      setLessonDraft((d) => ({
        ...d,
        description_ar: data.description_ar,
        description_en: data.description_en,
      }))
      toast.success(tAi('lesson_improved'))
    } catch {
      toast.error(tAi('lesson_improve_error'))
    } finally {
      setAiLessonLoading(false)
    }
  }

  const handleGenerateQuiz = async () => {
    setAiLessonLoading(true)
    try {
      const res = await fetch('/api/instructor/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lessonDraft.title_ar,
          lessonTitleEn: lessonDraft.title,
          lessonDescription: lessonDraft.description_ar || lessonDraft.description_en || lessonDraft.title_ar,
          courseLevel,
        }),
      })
      if (!res.ok) {
        toast.error(tAi('quiz_error'))
        return
      }
      const data = (await res.json()) as { questions: AiQuizQuestion[] }
      setQuizPreview(data.questions)
      toast.success(tAi('quiz_generated'))
    } catch {
      toast.error(tAi('quiz_error'))
    } finally {
      setAiLessonLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sections panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{t('sections')}</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowSectionForm(!showSectionForm)}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('add_section')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {showSectionForm && (
              <div className="space-y-2 rounded-lg border p-3">
                <Input
                  placeholder={t('section_title_ar')}
                  value={sectionForm.title_ar}
                  onChange={(e) =>
                    setSectionForm((f) => ({ ...f, title_ar: e.target.value }))
                  }
                />
                <Input
                  placeholder={t('section_title_en')}
                  value={sectionForm.title}
                  onChange={(e) =>
                    setSectionForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSection}
                  disabled={loading}
                >
                  {t('save_section')}
                </Button>
              </div>
            )}

            <ul className="space-y-1">
              {sections.map((section) => {
                const title = isAr ? section.title_ar : section.title
                return (
                  <li
                    key={section.id}
                    className={`flex items-center justify-between rounded-md px-2 py-2 cursor-pointer ${
                      selectedSectionId === section.id ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <button
                      type="button"
                      className="flex-1 text-start text-sm truncate"
                      onClick={() => setSelectedSectionId(section.id)}
                    >
                      {title}
                      <span className="text-xs text-muted-foreground ms-2">
                        ({section.lessons.length})
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSection(section.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </li>
                )
              })}
            </ul>

            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('no_sections')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lessons panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('lessons')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedSection ? (
              <p className="text-sm text-muted-foreground">{t('select_section')}</p>
            ) : (
              <>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedSection.lessons.map((lesson) => {
                    const title = isAr ? lesson.title_ar : lesson.title
                    return (
                      <li
                        key={lesson.id}
                        className="flex items-center justify-between rounded-md border px-2 py-2 text-sm"
                      >
                        <button
                          type="button"
                          className="flex-1 text-start truncate hover:text-primary"
                          onClick={() => startEditLesson(lesson)}
                        >
                          {title}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLesson(lesson.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>

                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {editingLesson ? t('edit_lesson') : t('add_lesson')}
                  </p>
                  <Input
                    placeholder={t('lesson_title_ar')}
                    value={lessonDraft.title_ar}
                    onChange={(e) =>
                      setLessonDraft((d) => ({ ...d, title_ar: e.target.value }))
                    }
                  />
                  <Input
                    placeholder={t('lesson_title_en')}
                    value={lessonDraft.title}
                    onChange={(e) =>
                      setLessonDraft((d) => ({ ...d, title: e.target.value }))
                    }
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{tAi('lesson_description_ar')}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-orange-600"
                        disabled={aiLessonLoading || !lessonDraft.title_ar}
                        onClick={() => void handleImproveLesson()}
                      >
                        {aiLessonLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {tAi('improve_lesson')}
                      </Button>
                    </div>
                    <Textarea
                      rows={3}
                      value={lessonDraft.description_ar}
                      onChange={(e) =>
                        setLessonDraft((d) => ({ ...d, description_ar: e.target.value }))
                      }
                    />
                  </div>
                  <Textarea
                    placeholder={tAi('lesson_description_en')}
                    rows={2}
                    value={lessonDraft.description_en}
                    onChange={(e) =>
                      setLessonDraft((d) => ({ ...d, description_en: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 border-orange-500/50 text-orange-600"
                    disabled={aiLessonLoading || !lessonDraft.title}
                    onClick={() => void handleGenerateQuiz()}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {tAi('generate_quiz')}
                  </Button>
                  {quizPreview && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
                      <p className="font-medium">{tAi('quiz_preview')}</p>
                      {quizPreview.map((q, i) => (
                        <p key={i}>{isAr ? q.question_ar : q.question_en}</p>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>{t('duration_minutes')}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={lessonDraft.duration_minutes}
                      onChange={(e) =>
                        setLessonDraft((d) => ({
                          ...d,
                          duration_minutes: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <VideoUpload
                    courseId={courseId}
                    videoSlot="lesson"
                    lessonId={editingLesson?.id ?? draftLessonId}
                    currentUrl={lessonDraft.video_asset_id}
                    onUploaded={(assetId, duration) =>
                      setLessonDraft((d) => ({
                        ...d,
                        video_asset_id: assetId,
                        duration_minutes: duration ?? d.duration_minutes,
                      }))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={lessonDraft.is_free_preview}
                      onCheckedChange={(checked) =>
                        setLessonDraft((d) => ({ ...d, is_free_preview: checked }))
                      }
                    />
                    <Label>{t('free_preview')}</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveLesson}
                      disabled={loading}
                    >
                      {editingLesson ? t('update_lesson') : t('save_lesson')}
                    </Button>
                    {editingLesson && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingLesson(null)
                          setLessonDraft(emptyLesson())
                        }}
                      >
                        {t('cancel_edit')}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {!standalone && (
        <div className="flex justify-between pt-4">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack}>
              {t('back_step')}
            </Button>
          )}
          <Button type="button" onClick={handleNext} disabled={loading}>
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('next_step')}
          </Button>
        </div>
      )}
    </div>
  )
}
