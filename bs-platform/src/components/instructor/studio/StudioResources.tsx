'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
  FileStack,
  FolderOpen,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ResourceLessonSelect, {
  type ResourceLessonSection,
} from '@/components/instructor/studio/ResourceLessonSelect'
import ResourceFileUpload from '@/components/instructor/studio/ResourceFileUpload'
import {
  addCourseResource,
  deleteCourseResource,
  updateCourseResource,
} from '@/lib/instructor/studio/studio-actions'
import type { LessonResourceRow } from '@/lib/courses/get-lesson-resources'
import type { ResourceCategory, ResourceUrlAccessMode } from '@/types'
import { toast } from 'sonner'

interface StudioResourcesProps {
  locale: string
  courseId: string
  initialResources: LessonResourceRow[]
  sections: ResourceLessonSection[]
}

const CATEGORIES: ResourceCategory[] = [
  'documents',
  'source_code',
  'design_assets',
  'templates',
  'datasets',
]

const EMPTY_FORM = {
  title: '',
  file_url: '',
  file_size_bytes: 0,
  url_access_mode: 'visit' as ResourceUrlAccessMode,
  category: 'documents' as ResourceCategory,
  folder: 'general',
  lesson_id: '',
}

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function findLessonTitle(
  sections: ResourceLessonSection[],
  lessonId: string | null
): string | null {
  if (!lessonId) return null
  for (const section of sections) {
    const lesson = section.lessons.find((l) => l.id === lessonId)
    if (lesson) return `${section.title} · ${lesson.title}`
  }
  return null
}

export default function StudioResources({
  locale,
  courseId,
  initialResources,
  sections,
}: StudioResourcesProps) {
  const t = useTranslations('studio.resources')
  const [resources, setResources] = useState(initialResources)
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const editingResource = resources.find((r) => r.id === editingId)
  const isLessonEditorResource = editingResource?.added_source === 'lesson_editor'

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  const startAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const startEdit = (resource: LessonResourceRow) => {
    setEditingId(resource.id)
    setForm({
      title: resource.title,
      file_url: resource.file_url,
      file_size_bytes: resource.file_size_bytes ?? 0,
      url_access_mode: resource.url_access_mode ?? 'download',
      category: resource.category,
      folder: resource.folder,
      lesson_id: resource.lesson_id ?? '',
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title.trim() || (!editingId && !form.file_url.trim())) {
      toast.error(t('validation'))
      return
    }
    if (editingId && !isLessonEditorResource && !form.file_url.trim()) {
      toast.error(t('validation'))
      return
    }

    startTransition(async () => {
      if (editingId) {
        const result = await updateCourseResource(editingId, courseId, locale, {
          title: form.title,
          file_url: form.file_url,
          file_type: 'document',
          category: form.category,
          folder: form.folder,
          lesson_id: form.lesson_id || null,
          file_size_bytes: form.file_size_bytes,
          url_access_mode: form.url_access_mode,
        })
        if (!result.success) {
          toast.error(t('save_error'))
          return
        }

        const linkedLabel = findLessonTitle(sections, form.lesson_id || null)
        setResources(
          resources.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  title: form.title,
                  file_url: isLessonEditorResource ? r.file_url : form.file_url,
                  url_access_mode: isLessonEditorResource
                    ? r.url_access_mode
                    : form.url_access_mode,
                  category: form.category,
                  folder: form.folder,
                  lesson_id: isLessonEditorResource ? r.lesson_id : form.lesson_id || null,
                  lesson_title: linkedLabel?.split(' · ').pop() ?? r.lesson_title,
                }
              : r
          )
        )
        toast.success(t('updated'))
        resetForm()
        return
      }

      const result = await addCourseResource(courseId, locale, {
        title: form.title,
        file_url: form.file_url,
        file_type: 'document',
        category: form.category,
        folder: form.folder,
        lesson_id: form.lesson_id || null,
        file_size_bytes: form.file_size_bytes,
        url_access_mode: form.url_access_mode,
      })
      if (!result.success || !result.resourceId) {
        toast.error(t('save_error'))
        return
      }

      const linkedLabel = findLessonTitle(sections, form.lesson_id || null)
      setResources([
        {
          id: result.resourceId,
          course_id: courseId,
          lesson_id: form.lesson_id || null,
          title: form.title,
          title_ar: null,
          file_url: form.file_url,
          file_type: 'document',
          category: form.category,
          folder: form.folder,
          file_size_bytes: form.file_size_bytes,
          url_access_mode: form.url_access_mode,
          added_source: 'studio',
          added_by: null,
          created_at: new Date().toISOString(),
          lesson_title: linkedLabel?.split(' · ').pop() ?? null,
          lesson_title_ar: null,
          added_by_name: null,
        },
        ...resources,
      ])
      toast.success(t('added'))
      resetForm()
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteCourseResource(id, courseId, locale)
      if (!result.success) {
        toast.error(t('save_error'))
        return
      }
      setResources(resources.filter((r) => r.id !== id))
      if (editingId === id) resetForm()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t('hint')}</p>
        <Button size="sm" className="gap-1.5" onClick={startAdd} disabled={showForm && !editingId}>
          <Plus className="h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      {showForm && (
        <Card className="edu-card shadow-none border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">
              {editingId ? t('edit_resource') : t('add')}
            </CardTitle>
            <Button type="button" variant="ghost" size="icon-sm" onClick={resetForm}>
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {isLessonEditorResource && (
              <p className="md:col-span-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                {t('lesson_editor_edit_hint')}
              </p>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label>{t('title')}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('file')}</Label>
              <ResourceFileUpload
                courseId={courseId}
                fileUrl={form.file_url}
                urlAccessMode={form.url_access_mode}
                disabled={isLessonEditorResource}
                onFileUrlChange={(url) =>
                  setForm({
                    ...form,
                    file_url: url,
                    file_size_bytes: 0,
                    url_access_mode: url.trim() ? form.url_access_mode : 'visit',
                  })
                }
                onUrlAccessModeChange={(mode) =>
                  setForm({ ...form, url_access_mode: mode })
                }
                onFileUploaded={(url, fileSizeBytes) =>
                  setForm({
                    ...form,
                    file_url: url,
                    file_size_bytes: fileSizeBytes,
                    url_access_mode: 'download',
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t('category')}</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as ResourceCategory })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`categories.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('folder')}</Label>
              <Input
                value={form.folder}
                onChange={(e) => setForm({ ...form, folder: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('link_lesson')}</Label>
              <ResourceLessonSelect
                sections={sections}
                value={isLessonEditorResource ? (editingResource?.lesson_id ?? '') : form.lesson_id}
                onChange={(lessonId) => setForm({ ...form, lesson_id: lessonId })}
                className={isLessonEditorResource ? 'pointer-events-none opacity-60' : undefined}
              />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button onClick={handleSave} disabled={pending} className="gap-2">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? t('save_changes') : t('save')}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} disabled={pending}>
                {t('cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {resources.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <FileStack className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t('resource_log')}</h3>
          {resources.map((resource) => (
            <div
              key={resource.id}
              className={`edu-card p-4 ${editingId === resource.id ? 'ring-2 ring-primary/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-medium">{resource.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {resource.folder}
                    </span>
                    <span>·</span>
                    <span>{t(`categories.${resource.category}`)}</span>
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0 text-primary/80" />
                      {t('added_from')}:{' '}
                      <span className="text-foreground/80">
                        {resource.added_source === 'lesson_editor'
                          ? t('source_lesson_editor')
                          : t('source_studio')}
                      </span>
                    </p>
                    <p>
                      {t('linked_to')}:{' '}
                      <span className="text-foreground/80">
                        {resource.lesson_id
                          ? findLessonTitle(sections, resource.lesson_id) ??
                            resource.lesson_title ??
                            t('unknown_lesson')
                          : t('course_wide')}
                      </span>
                    </p>
                    <p className="num-en">
                      {t('added_at')}: {formatDate(resource.created_at, locale)}
                    </p>
                    {resource.added_by_name && (
                      <p>
                        {t('added_by')}:{' '}
                        <span className="text-foreground/80">{resource.added_by_name}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => startEdit(resource)}
                    disabled={pending}
                    aria-label={t('edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(resource.id)}
                    disabled={pending}
                    aria-label={t('delete')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
