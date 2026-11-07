'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CVFormData } from '@/types/cv'
import { toast } from 'sonner'

interface CvSummaryTabProps {
  form: CVFormData
  onChange: (patch: Partial<CVFormData>) => void
}

const MAX_CHARS = 600

export default function CvSummaryTab({ form, onChange }: CvSummaryTabProps) {
  const t = useTranslations('cv')
  const [aiLoading, setAiLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)

  const writeWithAi = async () => {
    setAiLoading(true)
    setSuggestion(null)
    try {
      const skills = form.skills.groups.flatMap((g) => g.skills)
      const res = await fetch('/api/cv/write-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: form.experience,
          skills,
          headline: form.personalInfo.headline,
        }),
      })
      const data = (await res.json()) as { summary?: string }
      if (!res.ok || !data.summary) {
        toast.error(t('pdf_error'))
        return
      }
      setSuggestion(data.summary.slice(0, MAX_CHARS))
    } catch {
      toast.error(t('pdf_error'))
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{t('professional_summary')}</Label>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void writeWithAi()} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t('write_with_ai')}
        </Button>
      </div>

      <Textarea
        value={form.summary}
        onChange={(e) => onChange({ summary: e.target.value.slice(0, MAX_CHARS) })}
        rows={8}
        className="resize-y"
      />
      <p className="text-xs text-muted-foreground text-end num-en">
        {form.summary.length}/{MAX_CHARS}
      </p>

      {suggestion && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-sm whitespace-pre-wrap">{suggestion}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange({ summary: suggestion })
                setSuggestion(null)
              }}
            >
              {t('accept_suggestion')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void writeWithAi()} disabled={aiLoading}>
              {t('regenerate')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
