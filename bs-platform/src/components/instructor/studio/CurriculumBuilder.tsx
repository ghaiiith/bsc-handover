'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  createSection,
  deleteLesson,
  deleteSection,
  getCourseWizardSections,
} from '@/lib/instructor/course-wizard-actions'
import {
  createLessonWithType,
  reorderLessons,
  reorderSections,
  updateSectionTitle,
} from '@/lib/instructor/studio/studio-actions'
import LessonEditorPanel from '@/components/instructor/studio/LessonEditorPanel'
import ContentTypePicker from '@/components/instructor/studio/ContentTypePicker'
import type { SectionWithLessons } from '@/lib/courses/lesson-utils'
import type { Lesson, LessonType } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const LESSON_TYPE_ICONS: Record<LessonType, string> = {
  video: '🎬',
  pdf: '📄',
  article: '📝',
  download: '📦',
  external: '🔗',
  live: '📡',
  quiz: '❓',
  assignment: '📋',
}

interface CurriculumBuilderProps {
  locale: string
  courseId: string
  initialSections: SectionWithLessons[]
}

export default function CurriculumBuilder({
  locale,
  courseId,
  initialSections,
}: CurriculumBuilderProps) {
  const t = useTranslations('studio.curriculum')
  const ti = useTranslations('instructor')
  const isAr = locale === 'ar'

  const [sections, setSections] = useState(initialSections)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialSections.map((s) => s.id))
  )
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [dragSectionId, setDragSectionId] = useState<string | null>(null)
  const [dragLessonId, setDragLessonId] = useState<string | null>(null)
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [sectionDraft, setSectionDraft] = useState({ title: '', title_ar: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSections(initialSections)
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const section of initialSections) {
        next.add(section.id)
      }
      return next
    })
  }, [initialSections])

  const refresh = useCallback(async () => {
    const result = await getCourseWizardSections(courseId)
    if (!result.error) {
      setSections(result.sections)
      setSelectedLesson((prev) => {
        if (!prev) return null
        for (const section of result.sections) {
          const lesson = section.lessons?.find((l) => l.id === prev.id)
          if (lesson) return lesson
        }
        return null
      })
    }
  }, [courseId])

  const toggleSection = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddSection = async () => {
    const title = t('new_module')
    const title_ar = t('new_module_ar')
    setLoading(true)
    const result = await createSection(courseId, { title, title_ar }, locale)
    setLoading(false)
    if (!result.success) {
      toast.error(ti('save_error'))
      return
    }
    await refresh()
    if (result.sectionId) {
      setExpanded((prev) => new Set([...prev, result.sectionId!]))
      setEditingSectionId(result.sectionId)
      setSectionDraft({ title, title_ar })
    }
  }

  const handleSaveSectionTitle = async (sectionId: string) => {
    setLoading(true)
    const result = await updateSectionTitle(
      sectionId,
      courseId,
      sectionDraft.title,
      sectionDraft.title_ar,
      locale
    )
    setLoading(false)
    if (!result.success) {
      toast.error(result.error === 'validation_failed' ? t('section_title_required') : ti('save_error'))
      return
    }
    setEditingSectionId(null)
    toast.success(t('module_saved'))
    await refresh()
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm(ti('confirm_delete_section'))) return
    setLoading(true)
    await deleteSection(sectionId, courseId, locale)
    setLoading(false)
    if (selectedLesson?.section_id === sectionId) setSelectedLesson(null)
    await refresh()
  }

  const handleAddContent = async (sectionId: string, type: LessonType) => {
    setPickerSectionId(null)
    setLoading(true)
    const result = await createLessonWithType(sectionId, courseId, type, locale)
    setLoading(false)
    if (!result.success || !result.lessonId) {
      toast.error(ti('save_error'))
      return
    }
    const refreshed = await getCourseWizardSections(courseId)
    if (!refreshed.error) {
      setSections(refreshed.sections)
      for (const section of refreshed.sections) {
        const lesson = section.lessons?.find((l) => l.id === result.lessonId)
        if (lesson) {
          setSelectedLesson(lesson)
          setExpanded((prev) => new Set([...prev, section.id]))
          break
        }
      }
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm(ti('confirm_delete_lesson'))) return
    setLoading(true)
    await deleteLesson(lessonId, courseId, locale)
    setLoading(false)
    if (selectedLesson?.id === lessonId) setSelectedLesson(null)
    await refresh()
  }

  const onSectionDragStart = (sectionId: string) => setDragSectionId(sectionId)

  const onSectionDrop = async (targetId: string) => {
    if (!dragSectionId || dragSectionId === targetId) return
    const ids = sections.map((s) => s.id)
    const from = ids.indexOf(dragSectionId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    ids.splice(from, 1)
    ids.splice(to, 0, dragSectionId)
    setSections(
      ids.map((id, i) => {
        const section = sections.find((s) => s.id === id)!
        return { ...section, order_index: i }
      })
    )
    setDragSectionId(null)
    await reorderSections(courseId, ids, locale)
  }

  const onLessonDragStart = (lessonId: string) => setDragLessonId(lessonId)

  const onLessonDrop = async (sectionId: string, targetLessonId: string) => {
    if (!dragLessonId || dragLessonId === targetLessonId) return
    const section = sections.find((s) => s.id === sectionId)
    if (!section?.lessons) return
    const ids = section.lessons.map((l) => l.id)
    const from = ids.indexOf(dragLessonId)
    const to = ids.indexOf(targetLessonId)
    if (from < 0 || to < 0) return
    ids.splice(from, 1)
    ids.splice(to, 0, dragLessonId)
    setDragSectionId(null)
    setDragLessonId(null)
    await reorderLessons(courseId, sectionId, ids, locale)
    await refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t('hint')}</p>
          <Button size="sm" onClick={handleAddSection} disabled={loading} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t('add_module')}
          </Button>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <p className="text-muted-foreground">{t('empty')}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleAddSection}>
              {t('add_first_module')}
            </Button>
          </div>
        ) : (
          sections.map((section) => {
            const isOpen = expanded.has(section.id)
            const sectionTitle = isAr ? section.title_ar : section.title

            return (
              <div
                key={section.id}
                draggable
                onDragStart={() => onSectionDragStart(section.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onSectionDrop(section.id)}
                className="edu-card overflow-hidden shadow-none"
              >
                <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="flex shrink-0 items-center justify-center rounded-md p-0.5 hover:bg-muted"
                    aria-label={isOpen ? 'Collapse module' : 'Expand module'}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {editingSectionId === section.id ? (
                    <div className="flex min-w-0 flex-1 gap-2">
                      <Input
                        className="h-8 text-sm"
                        value={sectionDraft.title}
                        onChange={(e) =>
                          setSectionDraft({ ...sectionDraft, title: e.target.value })
                        }
                      />
                      <Input
                        className="h-8 text-sm"
                        value={sectionDraft.title_ar}
                        onChange={(e) =>
                          setSectionDraft({ ...sectionDraft, title_ar: e.target.value })
                        }
                        dir="rtl"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSaveSectionTitle(section.id)}
                      >
                        {t('save')}
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="min-w-0 flex-1 truncate text-start font-medium hover:text-primary"
                    >
                      {sectionTitle}
                    </button>
                  )}
                </div>
                  <span className="text-xs text-muted-foreground num-en shrink-0">
                    {(section.lessons ?? []).length} {t('lessons')}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingSectionId(section.id)
                          setSectionDraft({
                            title: section.title,
                            title_ar: section.title_ar,
                          })
                        }}
                      >
                        {t('rename_module')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4 me-2" />
                        {t('delete_module')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isOpen && (
                  <div className="p-2 space-y-1">
                    {(section.lessons ?? []).map((lesson) => {
                      const lessonTitle = isAr ? lesson.title_ar : lesson.title
                      const type = (lesson.lesson_type ?? 'video') as LessonType
                      const isSelected = selectedLesson?.id === lesson.id

                      return (
                        <div
                          key={lesson.id}
                          draggable
                          onDragStart={() => onLessonDragStart(lesson.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onLessonDrop(section.id, lesson.id)}
                          className={cn(
                            'group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted/60'
                          )}
                          onClick={() => setSelectedLesson(lesson)}
                        >
                          <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />
                          <span className="shrink-0 text-base leading-none">
                            {LESSON_TYPE_ICONS[type]}
                          </span>
                          <span className="flex-1 truncate">{lessonTitle}</span>
                          {lesson.is_free_preview && (
                            <span className="rounded bg-brand-green/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-green">
                              {t('preview')}
                            </span>
                          )}
                          <button
                            type="button"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteLesson(lesson.id)
                            }}
                            aria-label={ti('confirm_delete_lesson')}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      )
                    })}

                    {pickerSectionId === section.id ? (
                      <ContentTypePicker
                        onSelect={(type) => handleAddContent(section.id, type)}
                        onCancel={() => setPickerSectionId(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPickerSectionId(section.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        {t('add_content')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="lg:col-span-2">
        {selectedLesson ? (
          <LessonEditorPanel
            key={selectedLesson.id}
            locale={locale}
            courseId={courseId}
            lesson={selectedLesson}
            onUpdated={refresh}
            onClose={() => setSelectedLesson(null)}
          />
        ) : (
          <div className="sticky top-4 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">{t('select_lesson')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
