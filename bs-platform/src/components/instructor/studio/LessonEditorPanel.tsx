'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Download, Loader2, Save, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import VideoUpload from '@/components/courses/VideoUpload'
import VideoAssetDetailsPanel from '@/components/instructor/studio/VideoAssetDetailsPanel'
import DocumentUpload from '@/components/courses/DocumentUpload'
import QuizStudioDialog from '@/components/instructor/studio/QuizStudioDialog'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { updateLessonStudio, saveLessonDetails } from '@/lib/instructor/studio/studio-actions'
import type { Lesson, LessonType } from '@/types'
import { toast } from 'sonner'

interface LessonEditorPanelProps {
  locale: string
  courseId: string
  lesson: Lesson
  onUpdated: () => void
  onClose: () => void
}

export default function LessonEditorPanel({
  locale,
  courseId,
  lesson,
  onUpdated,
  onClose,
}: LessonEditorPanelProps) {
  const t = useTranslations('studio.lesson')
  const ti = useTranslations('instructor')
  const tc = useTranslations('courses')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [quizStudioOpen, setQuizStudioOpen] = useState(false)

  const [form, setForm] = useState({
    title: lesson.title,
    title_ar: lesson.title_ar,
    duration_minutes: lesson.duration_minutes,
    is_free_preview: lesson.is_free_preview,
    is_mandatory: lesson.is_mandatory ?? true,
    video_asset_id: lesson.video_asset_id ?? '',
    content_html: lesson.content_html ?? '',
    external_url: lesson.external_url ?? '',
    attachment_url: lesson.attachment_url ?? '',
    trainer_notes_html: lesson.trainer_notes_html ?? '',
  })
  const [slides, setSlides] = useState({
    url: lesson.slides_url ?? '',
    name: lesson.slides_name ?? '',
  })
  const [generating, setGenerating] = useState(false)

  const lessonType = (lesson.lesson_type ?? 'video') as LessonType
  const hasVideo = Boolean(form.video_asset_id)

  const persistVideo = (assetId: string | null, durationMinutes?: number) => {
    const nextDuration = assetId
      ? Math.max(1, durationMinutes ?? (form.duration_minutes || 1))
      : 5

    setForm((prev) => ({
      ...prev,
      video_asset_id: assetId ?? '',
      duration_minutes: nextDuration,
    }))

    startTransition(async () => {
      const result = await updateLessonStudio(
        lesson.id,
        courseId,
        {
          video_asset_id: assetId,
          duration_minutes: nextDuration,
        },
        locale
      )

      if (!result.success) {
        toast.error(ti('save_error'))
        return
      }

      onUpdated()
      router.refresh()
    })
  }

  const persistAttachment = (url: string | null) => {
    setForm((prev) => ({
      ...prev,
      attachment_url: url ?? '',
    }))

    startTransition(async () => {
      const result = await updateLessonStudio(
        lesson.id,
        courseId,
        { attachment_url: url },
        locale
      )

      if (!result.success) {
        toast.error(ti('save_error'))
        return
      }

      onUpdated()
      router.refresh()
    })
  }

  const persistSlides = (url: string | null, name: string | null) => {
    setSlides({ url: url ?? '', name: name ?? '' })
    startTransition(async () => {
      const result = await updateLessonStudio(
        lesson.id,
        courseId,
        { slides_url: url, slides_name: name },
        locale
      )
      if (!result.success) {
        toast.error(ti('save_error'))
        return
      }
      onUpdated()
      router.refresh()
    })
  }

  // Report BS-30: capture the AI tool's slide deck and written draft instead of
  // discarding them. The draft lands in the trainer notes box (report BS-31).
  const generateMaterials = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/instructor/ai/lesson-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, lessonId: lesson.id, language: locale === 'ar' ? 'ar' : 'en' }),
      })
      const data = (await res.json()) as {
        notesHtml?: string
        slidesUrl?: string
        slidesName?: string
        error?: string
      }

      if (!res.ok) {
        toast.error(data.error === 'trainer_studio_not_configured' ? t('ai_unavailable') : t('ai_failed'))
        return
      }

      if (data.notesHtml) {
        setForm((prev) => ({ ...prev, trainer_notes_html: data.notesHtml as string }))
      }
      if (data.slidesUrl) {
        setSlides({ url: data.slidesUrl, name: data.slidesName ?? 'slides.pptx' })
      }
      toast.success(t('ai_done'))
      onUpdated()
      router.refresh()
    } catch {
      toast.error(t('ai_failed'))
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    setForm({
      title: lesson.title,
      title_ar: lesson.title_ar,
      duration_minutes: lesson.duration_minutes,
      is_free_preview: lesson.is_free_preview,
      is_mandatory: lesson.is_mandatory ?? true,
      video_asset_id: lesson.video_asset_id ?? '',
      content_html: lesson.content_html ?? '',
      external_url: lesson.external_url ?? '',
      attachment_url: lesson.attachment_url ?? '',
      trainer_notes_html: lesson.trainer_notes_html ?? '',
    })
    setSlides({ url: lesson.slides_url ?? '', name: lesson.slides_name ?? '' })
    setQuizStudioOpen(false)
  }, [
    lesson.id,
    lesson.title,
    lesson.title_ar,
    lesson.duration_minutes,
    lesson.is_free_preview,
    lesson.is_mandatory,
    lesson.video_asset_id,
    lesson.content_html,
    lesson.external_url,
    lesson.attachment_url,
    lesson.trainer_notes_html,
    lesson.slides_url,
    lesson.slides_name,
  ])

  const handleSave = () => {
    if (!form.title.trim() || !form.title_ar.trim()) {
      toast.error(t('validation_required'))
      return
    }

    startTransition(async () => {
      const result = await saveLessonDetails(
        lesson.id,
        courseId,
        {
          title: form.title.trim(),
          title_ar: form.title_ar.trim() || form.title.trim(),
          duration_minutes: form.duration_minutes,
          is_free_preview: form.is_free_preview,
          is_mandatory: form.is_mandatory,
          video_asset_id: form.video_asset_id || null,
          content_html: form.content_html || null,
          external_url: form.external_url || null,
          attachment_url: form.attachment_url || null,
          trainer_notes_html: form.trainer_notes_html || null,
        },
        locale
      )

      if (!result.success) {
        toast.error(
          result.error === 'validation_failed' ? t('validation_required') : ti('save_error')
        )
        return
      }

      toast.success(t('saved'))
      onUpdated()
      router.refresh()
    })
  }

  return (
    <Card className="edu-card sticky top-4 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
        <div className="space-y-2">
          <Label>{ti('title_en')}</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{ti('title_ar')}</Label>
          <Input
            value={form.title_ar}
            onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
            dir="rtl"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{t('free_preview')}</p>
            <p className="text-xs text-muted-foreground">{t('free_preview_hint')}</p>
          </div>
          <Switch
            checked={form.is_free_preview}
            onCheckedChange={(v) => setForm({ ...form, is_free_preview: v })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{t('mandatory')}</p>
            <p className="text-xs text-muted-foreground">{t('mandatory_hint')}</p>
          </div>
          <Switch
            checked={form.is_mandatory}
            onCheckedChange={(v) => setForm({ ...form, is_mandatory: v })}
          />
        </div>

        {(lessonType === 'video' || lessonType === 'live') && (
          <div className="space-y-3">
            <Label>{t('video')}</Label>
            <VideoUpload
              courseId={courseId}
              videoSlot="lesson"
              lessonId={lesson.id}
              currentUrl={form.video_asset_id || null}
              onUploaded={(assetId, duration) => persistVideo(assetId, duration)}
              onRemoved={() => persistVideo(null)}
            />
            <VideoAssetDetailsPanel
              courseId={courseId}
              lessonId={lesson.id}
              assetId={form.video_asset_id || null}
            />
          </div>
        )}

        {hasVideo && (lessonType === 'video' || lessonType === 'live') && (
          <div className="space-y-2">
            <Label>{t('duration_auto')}</Label>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm num-en">
              {form.duration_minutes} {tc('minutes')}
              <p className="text-xs text-muted-foreground mt-1">{t('duration_hint')}</p>
            </div>
          </div>
        )}

        {(lessonType === 'article') && (
          <div className="space-y-2">
            <Label>{t('content')}</Label>
            <Textarea
              rows={8}
              value={form.content_html}
              onChange={(e) => setForm({ ...form, content_html: e.target.value })}
              placeholder={t('content_placeholder')}
            />
          </div>
        )}

        {(lessonType === 'pdf' || lessonType === 'download') && (
          <div className="space-y-2">
            <Label>{lessonType === 'pdf' ? t('pdf_upload') : t('attachment_url')}</Label>
            <DocumentUpload
              courseId={courseId}
              currentUrl={form.attachment_url || null}
              onUploaded={(url) => persistAttachment(url)}
              onRemoved={() => persistAttachment(null)}
              acceptPdfOnly={lessonType === 'pdf'}
            />
          </div>
        )}

        {lessonType === 'external' && (
          <div className="space-y-2">
            <Label>{t('external_url')}</Label>
            <Input
              value={form.external_url}
              onChange={(e) => setForm({ ...form, external_url: e.target.value })}
              placeholder="https://"
            />
          </div>
        )}

        {lessonType === 'quiz' && (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">{t('quiz_link')}</p>
            <p className="text-xs text-muted-foreground">{t('quiz_manage_modal')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setQuizStudioOpen(true)}
            >
              {t('quiz_open_studio')}
            </Button>
          </div>
        )}

        {/* Report BS-31: trainer-only notes for this lesson. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>{t('trainer_notes')}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={generating || pending}
              onClick={() => void generateMaterials()}
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {t('ai_materials')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('trainer_notes_hint')}</p>
          <RichTextEditor
            value={form.trainer_notes_html}
            onChange={(html) => setForm((prev) => ({ ...prev, trainer_notes_html: html }))}
            placeholder={t('trainer_notes_placeholder')}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            rows={8}
          />
        </div>

        {/* Report BS-30: the generated deck, downloadable and replaceable. */}
        <div className="space-y-2">
          <Label>{t('slides')}</Label>
          {slides.url && (
            <a
              href={slides.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">{slides.name || t('slides')}</span>
            </a>
          )}
          <DocumentUpload
            courseId={courseId}
            currentUrl={slides.url || null}
            acceptPdfOnly={false}
            acceptSlides
            onUploaded={(url) => persistSlides(url, url.split('/').pop() ?? 'slides.pptx')}
            onRemoved={() => persistSlides(null, null)}
          />
        </div>

        <QuizStudioDialog
          open={quizStudioOpen}
          onOpenChange={setQuizStudioOpen}
          locale={locale}
          courseId={courseId}
          lessonId={lesson.id}
          lessonTitle={form.title}
          onSaved={onUpdated}
        />

        <Button onClick={handleSave} disabled={pending} className="w-full gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('save')}
        </Button>
      </CardContent>
    </Card>
  )
}
