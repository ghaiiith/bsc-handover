'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AiCourseStructureModal from '@/components/instructor/ai/AiCourseStructureModal'
import { useCourseCategories } from '@/components/categories/CourseCategoriesProvider'
import { step1Schema, type Step1FormValues } from '@/lib/instructor/course-wizard-schemas'
import { applyAiCourseStructure, saveCourseStep1 } from '@/lib/instructor/course-wizard-actions'
import type { AiCourseStructureResponse } from '@/types/course-ai'
import { toast } from 'sonner'

interface Step1BasicInfoProps {
  locale: string
  courseId: string | null
  defaultValues?: Partial<Step1FormValues>
  onComplete: (courseId: string, values?: Step1FormValues) => void
  onAiApplied?: (data: {
    structure: AiCourseStructureResponse
    thumbnailPrompt: string
  }) => void
  standalone?: boolean
  submitLabel?: string
}

export default function Step1BasicInfo({
  locale,
  courseId,
  defaultValues,
  onComplete,
  onAiApplied,
  standalone = false,
  submitLabel,
}: Step1BasicInfoProps) {
  const t = useTranslations('instructor')
  const tAi = useTranslations('courseAi')
  const categories = useCourseCategories()
  const isAr = locale === 'ar'
  const [loading, setLoading] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [descLoading, setDescLoading] = useState(false)
  const [aiDescPreview, setAiDescPreview] = useState<{
    description_ar: string
    description_en: string
    learning_outcomes_ar?: string[]
    learning_outcomes_en?: string[]
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      title_ar: defaultValues?.title_ar ?? '',
      description: defaultValues?.description ?? '',
      description_ar: defaultValues?.description_ar ?? '',
      category: defaultValues?.category ?? '',
      level: defaultValues?.level ?? 'beginner',
      language: defaultValues?.language ?? 'ar',
    },
  })

  const category = watch('category')
  const level = watch('level')
  const language = watch('language')
  const titleAr = watch('title_ar')
  const titleEn = watch('title')
  const descAr = watch('description_ar')
  const descEn = watch('description')

  const canGenerateStructure =
    titleAr.trim().length >= 5 &&
    titleEn.trim().length >= 5 &&
    (descAr.trim().length >= 20 || descEn.trim().length >= 20) &&
    Boolean(category) &&
    Boolean(level)

  const canWriteDescription = titleAr.trim().length >= 5

  const onSubmit = async (values: Step1FormValues) => {
    setLoading(true)
    const result = await saveCourseStep1(values, courseId, locale)
    setLoading(false)

    if (!result.success || !result.courseId) {
      toast.error(t('save_error'))
      return
    }

    if (standalone) {
      toast.success(t('course_save_success'))
    }

    onComplete(result.courseId, values)
  }

  const handleWriteDescription = async () => {
    setDescLoading(true)
    setAiDescPreview(null)
    try {
      const values = getValues()
      const res = await fetch('/api/instructor/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title_ar,
          titleEn: values.title,
          currentDescription: values.description_ar || values.description,
          category: values.category,
          level: values.level,
        }),
      })
      if (!res.ok) {
        toast.error(tAi('desc_error'))
        return
      }
      const data = await res.json()
      setAiDescPreview(data)
    } catch {
      toast.error(tAi('desc_error'))
    } finally {
      setDescLoading(false)
    }
  }

  const acceptDescription = () => {
    if (!aiDescPreview) return
    setValue('description_ar', aiDescPreview.description_ar)
    setValue('description', aiDescPreview.description_en)
    setAiDescPreview(null)
    toast.success(tAi('desc_applied'))
  }

  const handleStructureGenerated = async (structure: AiCourseStructureResponse) => {
    setValue('description_ar', structure.description_ar)
    setValue('description', structure.description_en)

    const values = getValues()
    const merged: Step1FormValues = {
      ...values,
      description_ar: structure.description_ar,
      description: structure.description_en,
    }

    setLoading(true)
    const saveResult = await saveCourseStep1(merged, courseId, locale)
    if (!saveResult.success || !saveResult.courseId) {
      setLoading(false)
      toast.error(t('save_error'))
      return
    }

    const applyResult = await applyAiCourseStructure(
      saveResult.courseId,
      structure,
      locale,
      true
    )
    setLoading(false)

    if (!applyResult.success) {
      toast.error(t('save_error'))
      return
    }

    // Report BS-59/76: never drop part of the AI response silently — tell the
    // instructor exactly which lesson's quiz/notes did not save.
    if (applyResult.warnings?.length) {
      const parts = applyResult.warnings.slice(0, 4).map((w) => {
        const [kind, lesson] = w.split(':')
        return `${kind === 'quiz' ? t('ai_part_quiz') : t('ai_part_notes')} — ${lesson}`
      })
      toast.warning(
        `${t('ai_partial_import', { count: applyResult.warnings.length })}\n${parts.join('\n')}`,
        { duration: 10000 }
      )
    }

    onAiApplied?.({
      structure,
      thumbnailPrompt: structure.thumbnail_prompt,
    })
    onComplete(saveResult.courseId, merged)
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title_ar">{t('title_ar')}</Label>
            <Input id="title_ar" {...register('title_ar')} />
            {errors.title_ar && (
              <p className="text-xs text-destructive">{t('title_min_error')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">{t('title_en')}</Label>
            <Input id="title" {...register('title')} />
            {errors.title && (
              <p className="text-xs text-destructive">{t('title_min_error')}</p>
            )}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="description_ar">{t('description_ar')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-orange-600"
                disabled={!canWriteDescription || descLoading}
                onClick={() => void handleWriteDescription()}
              >
                {descLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {tAi('write_with_ai')}
              </Button>
            </div>
            <Textarea id="description_ar" rows={5} {...register('description_ar')} />
            {errors.description_ar && (
              <p className="text-xs text-destructive">{t('description_min_error')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description_en')}</Label>
            <Textarea id="description" rows={5} {...register('description')} />
            {errors.description && (
              <p className="text-xs text-destructive">{t('description_min_error')}</p>
            )}
          </div>
        </div>

        {aiDescPreview && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
            <p className="text-sm font-medium">{tAi('desc_preview_title')}</p>
            <div className="space-y-2 text-sm">
              <p className="line-clamp-4">{aiDescPreview.description_ar}</p>
              <p className="text-muted-foreground line-clamp-4">{aiDescPreview.description_en}</p>
            </div>
            {aiDescPreview.learning_outcomes_ar && aiDescPreview.learning_outcomes_ar.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc ps-4 space-y-1">
                {aiDescPreview.learning_outcomes_ar.slice(0, 4).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={acceptDescription}>
                {tAi('accept_desc')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAiDescPreview(null)}>
                {tAi('cancel')}
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('category')}</Label>
            <Select value={category} onValueChange={(v) => setValue('category', v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('select_category')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {isAr ? cat.label : cat.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">{t('category_required')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('level')}</Label>
            <Select
              value={level}
              onValueChange={(v) =>
                setValue('level', (v ?? 'beginner') as Step1FormValues['level'])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">{t('level_beginner')}</SelectItem>
                <SelectItem value="intermediate">{t('level_intermediate')}</SelectItem>
                <SelectItem value="advanced">{t('level_advanced')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('language')}</Label>
            <Select
              value={language}
              onValueChange={(v) =>
                setValue('language', (v ?? 'ar') as Step1FormValues['language'])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">{t('language_ar')}</SelectItem>
                <SelectItem value="en">{t('language_en')}</SelectItem>
                <SelectItem value="both">{t('language_both')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {canGenerateStructure && (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-orange-500 text-orange-600 hover:bg-orange-500/10"
            onClick={() => setAiModalOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            {tAi('generate_structure')}
          </Button>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {submitLabel ?? (standalone ? t('save_changes') : t('next_step'))}
          </Button>
        </div>
      </form>

      <AiCourseStructureModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        formValues={getValues()}
        onGenerated={(structure) => void handleStructureGenerated(structure)}
      />
    </>
  )
}
