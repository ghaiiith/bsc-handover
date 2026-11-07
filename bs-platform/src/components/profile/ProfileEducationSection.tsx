'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { PROFILE_DEGREES } from '@/lib/profile/profile-constants'
import { sortEducation } from '@/lib/profile/format-profile-dates'
import type { EducationItem, ProfileFormState } from '@/types/profile'

interface ProfileEducationSectionProps {
  locale: string
  form: ProfileFormState
  onChange: (patch: Partial<ProfileFormState>) => void
}

const emptyEducation = (): EducationItem => ({
  id: crypto.randomUUID(),
  institution: '',
  degree: PROFILE_DEGREES[0].value,
  field: '',
  start_year: new Date().getFullYear() - 4,
  end_year: new Date().getFullYear(),
  is_current: false,
})

export default function ProfileEducationSection({
  locale,
  form,
  onChange,
}: ProfileEducationSectionProps) {
  const t = useTranslations('profile')
  const isAr = locale === 'ar'
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<EducationItem>(emptyEducation())

  const items = sortEducation(form.education)

  const degreeLabel = (value: string) => {
    const found = PROFILE_DEGREES.find((d) => d.value === value)
    return found ? (isAr ? found.labelAr : found.labelEn) : value
  }

  const openNew = () => {
    setDraft(emptyEducation())
    setOpen(true)
  }

  const openEdit = (item: EducationItem) => {
    setDraft({ ...item })
    setOpen(true)
  }

  const saveDraft = () => {
    if (!draft.institution.trim() || !draft.field.trim()) return
    const exists = form.education.some((e) => e.id === draft.id)
    const next = exists
      ? form.education.map((e) => (e.id === draft.id ? draft : e))
      : [...form.education, draft]
    onChange({ education: next })
    setOpen(false)
  }

  const deleteItem = (id: string) => {
    if (!confirm(t('confirm_delete'))) return
    onChange({ education: form.education.filter((e) => e.id !== id) })
  }

  return (
    <>
      <Card id="education" className="edu-card shadow-none scroll-mt-24">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('education')}</CardTitle>
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t('add_education')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_education')}</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.institution}</p>
                    <p className="text-sm text-muted-foreground">
                      {degreeLabel(item.degree)} · {item.field}
                    </p>
                    <p className="text-xs text-muted-foreground num-en mt-1">
                      {item.start_year} — {item.is_current ? t('is_current') : item.end_year}
                      {item.gpa ? ` · GPA ${item.gpa}` : ''}
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
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_education')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('institution')}</Label>
              <Input
                value={draft.institution}
                onChange={(e) => setDraft({ ...draft, institution: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('degree')}</Label>
              <Select value={draft.degree} onValueChange={(v) => v && setDraft({ ...draft, degree: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROFILE_DEGREES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {isAr ? d.labelAr : d.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('field')}</Label>
              <Input value={draft.field} onChange={(e) => setDraft({ ...draft, field: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('start_year')}</Label>
                <Input
                  type="number"
                  className="num-en"
                  value={draft.start_year}
                  onChange={(e) => setDraft({ ...draft, start_year: parseInt(e.target.value, 10) || 2020 })}
                />
              </div>
              {!draft.is_current && (
                <div className="space-y-2">
                  <Label>{t('end_year')}</Label>
                  <Input
                    type="number"
                    className="num-en"
                    value={draft.end_year ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, end_year: parseInt(e.target.value, 10) || null })
                    }
                  />
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.is_current}
                onCheckedChange={(v) =>
                  setDraft({ ...draft, is_current: Boolean(v), end_year: v ? null : draft.end_year })
                }
              />
              {t('currently_studying')}
            </label>
            <div className="space-y-2">
              <Label>{t('gpa')}</Label>
              <Input value={draft.gpa ?? ''} onChange={(e) => setDraft({ ...draft, gpa: e.target.value })} />
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
