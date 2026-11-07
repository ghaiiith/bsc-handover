'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCount } from '@/lib/format-number'
import type { AiCourseStructureResponse } from '@/types/course-ai'
import type { Step1FormValues } from '@/lib/instructor/course-wizard-schemas'
import { toast } from 'sonner'

interface AiCourseStructureModalProps {
  isOpen: boolean
  onClose: () => void
  formValues: Step1FormValues
  onGenerated: (structure: AiCourseStructureResponse) => void
}

export default function AiCourseStructureModal({
  isOpen,
  onClose,
  formValues,
  onGenerated,
}: AiCourseStructureModalProps) {
  const t = useTranslations('courseAi')
  const [loading, setLoading] = useState(false)
  const [structure, setStructure] = useState<AiCourseStructureResponse | null>(null)
  const generateStartedRef = useRef(false)

  const reset = () => {
    setStructure(null)
    setLoading(false)
    generateStartedRef.current = false
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const runGenerate = useCallback(async () => {
    setLoading(true)
    setStructure(null)
    try {
      const description =
        formValues.description_ar?.trim().length >= 20
          ? formValues.description_ar
          : formValues.description

      const res = await fetch('/api/instructor/ai/generate-course-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: formValues.title_ar,
          courseTitleEn: formValues.title,
          description,
          category: formValues.category,
          level: formValues.level,
          language: formValues.language,
        }),
      })

      if (!res.ok) {
        // Report BS-49: AI course creation gated behind Pro.
        toast.error(res.status === 402 ? t('pro_required') : t('generate_error'))
        return
      }

      const data = (await res.json()) as AiCourseStructureResponse
      setStructure(data)
      if (data.isFallback) {
        toast.info(t('fallback_note'))
      }
    } catch {
      toast.error(t('generate_error'))
    } finally {
      setLoading(false)
    }
  }, [formValues, t])

  useEffect(() => {
    if (!isOpen) {
      reset()
      return
    }
    if (generateStartedRef.current) return
    generateStartedRef.current = true
    void runGenerate()
  }, [isOpen, runGenerate])

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose()
  }

  const totalLessons = structure?.sections.reduce((n, s) => n + s.lessons.length, 0) ?? 0

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            {t('modal_title')}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="text-sm text-muted-foreground">{t('generating')}</p>
            <p className="text-xs text-muted-foreground">{t('generating_note')}</p>
          </div>
        )}

        {!loading && structure && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">{t('preview_sections')}: </span>
                <span className="num-en font-medium">{formatCount(structure.sections.length)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">{t('preview_lessons')}: </span>
                <span className="num-en font-medium">{formatCount(totalLessons)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">{t('preview_hours')}: </span>
                <span className="num-en font-medium">{structure.estimated_total_hours}</span>
              </p>
            </div>

            <ul className="text-sm space-y-2 max-h-48 overflow-y-auto">
              {structure.sections.map((section, i) => (
                <li key={i} className="border-b pb-2">
                  <p className="font-medium">{section.title_ar}</p>
                  <p className="text-xs text-muted-foreground num-en">
                    {formatCount(section.lessons.length)} {t('lessons_label')}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  onGenerated(structure)
                  handleClose()
                  toast.success(t('applied_success'))
                }}
              >
                {t('apply_structure')}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
