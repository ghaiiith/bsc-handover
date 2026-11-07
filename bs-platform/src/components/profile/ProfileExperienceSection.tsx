'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  buildYearMonth,
  formatExperienceDateRange,
  parseYearMonth,
  sortExperience,
} from '@/lib/profile/format-profile-dates'
import { ENGLISH_MONTHS } from '@/lib/profile/profile-constants'
import type { ExperienceItem, ProfileFormState } from '@/types/profile'

interface ProfileExperienceSectionProps {
  form: ProfileFormState
  onChange: (patch: Partial<ProfileFormState>) => void
  enableAiImprove?: boolean
}

const emptyExperience = (): ExperienceItem => ({
  id: crypto.randomUUID(),
  company: '',
  title: '',
  start_date: '2024-01',
  end_date: null,
  is_current: false,
  location: '',
  description: '',
})

export default function ProfileExperienceSection({
  form,
  onChange,
  enableAiImprove = false,
}: ProfileExperienceSectionProps) {
  const t = useTranslations('profile')
  const tCv = useTranslations('cv')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ExperienceItem>(emptyExperience())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)

  const items = sortExperience(form.experience)

  const openNew = () => {
    setDraft(emptyExperience())
    setAiSuggestion(null)
    setOpen(true)
  }

  const openEdit = (item: ExperienceItem) => {
    setDraft({ ...item })
    setAiSuggestion(null)
    setOpen(true)
  }

  const improveWithAi = async () => {
    if (!draft.title.trim() || !draft.company.trim()) return
    setAiLoading(true)
    setAiSuggestion(null)
    try {
      const res = await fetch('/api/cv/improve-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          company: draft.company,
          description: draft.description,
        }),
      })
      const data = (await res.json()) as { description?: string }
      if (res.ok && data.description) {
        setAiSuggestion(data.description.slice(0, 500))
      }
    } finally {
      setAiLoading(false)
    }
  }

  const saveDraft = () => {
    if (!draft.title.trim() || !draft.company.trim()) return
    const exists = form.experience.some((e) => e.id === draft.id)
    const next = exists
      ? form.experience.map((e) => (e.id === draft.id ? draft : e))
      : [...form.experience, draft]
    onChange({ experience: next })
    setOpen(false)
  }

  const deleteItem = (id: string) => {
    if (!confirm(t('confirm_delete'))) return
    onChange({ experience: form.experience.filter((e) => e.id !== id) })
  }

  const startParts = parseYearMonth(draft.start_date)
  const endParts = parseYearMonth(draft.end_date ?? '2024-12')

  return (
    <>
      <Card id="experience" className="edu-card shadow-none scroll-mt-24">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('experience')}</CardTitle>
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t('add_experience')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_experience')}</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.company}</p>
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground num-en mt-1">
                      {formatExperienceDateRange(
                        item.start_date,
                        item.end_date,
                        item.is_current,
                        t('is_current')
                      )}
                      {item.location ? ` · ${item.location}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {item.description && (
                  <p
                    className={`text-sm text-muted-foreground leading-relaxed ${
                      expandedId === item.id ? '' : 'line-clamp-2'
                    }`}
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('add_experience')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('job_title')}</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('company')}</Label>
              <Input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('location')}</Label>
              <Input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('start_date')}</Label>
                <div className="flex gap-2">
                  <Select
                    value={startParts.month}
                    onValueChange={(m) => m && setDraft({ ...draft, start_date: buildYearMonth(startParts.year, m) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENGLISH_MONTHS.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="num-en w-20"
                    value={startParts.year}
                    onChange={(e) =>
                      setDraft({ ...draft, start_date: buildYearMonth(e.target.value, startParts.month) })
                    }
                  />
                </div>
              </div>
              {!draft.is_current && (
                <div className="space-y-2">
                  <Label>{t('end_date')}</Label>
                  <div className="flex gap-2">
                    <Select
                      value={endParts.month}
                      onValueChange={(m) =>
                        m && setDraft({ ...draft, end_date: buildYearMonth(endParts.year, m) })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ENGLISH_MONTHS.map((m, i) => (
                          <SelectItem key={m} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="num-en w-20"
                      value={endParts.year}
                      onChange={(e) =>
                        setDraft({ ...draft, end_date: buildYearMonth(e.target.value, endParts.month) })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.is_current}
                onCheckedChange={(v) =>
                  setDraft({ ...draft, is_current: Boolean(v), end_date: v ? null : draft.end_date })
                }
              />
              {t('currently_working')}
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('description')}</Label>
                {enableAiImprove && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-7"
                    disabled={aiLoading}
                    onClick={() => void improveWithAi()}
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {tCv('improve_with_ai')}
                  </Button>
                )}
              </div>
              <Textarea
                rows={4}
                maxLength={500}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
              <p className="text-xs text-end text-muted-foreground num-en">{draft.description.length}/500</p>
              {aiSuggestion && enableAiImprove && (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setDraft({ ...draft, description: aiSuggestion })
                        setAiSuggestion(null)
                      }}
                    >
                      {tCv('accept_suggestion')}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void improveWithAi()} disabled={aiLoading}>
                      {tCv('regenerate')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button type="button" onClick={saveDraft}>{t('save_item')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
