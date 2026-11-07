'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import SkillsTagInput from '@/components/shared/SkillsTagInput'
import { MAX_PROFILE_SKILLS } from '@/lib/profile/profile-constants'
import type { ProfileFormState } from '@/types/profile'
import { toast } from 'sonner'

interface ProfileSkillsSectionProps {
  form: ProfileFormState
  onChange: (patch: Partial<ProfileFormState>) => void
  canAccessAi?: boolean
}

export default function ProfileSkillsSection({
  form,
  onChange,
  canAccessAi = false,
}: ProfileSkillsSectionProps) {
  const t = useTranslations('profile')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const canSuggest = form.experience.length >= 1

  const handleSuggest = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile/suggest-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: form.experience,
          current_skills: form.skills,
        }),
      })
      const data = (await res.json()) as { skills?: string[]; error?: string }
      if (!res.ok) {
        toast.error(t('ai_error'))
        return
      }
      setSuggestions(data.skills ?? [])
      setSelected(new Set(data.skills ?? []))
      setModalOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const applySuggestions = () => {
    const toAdd = suggestions.filter((s) => selected.has(s))
    const merged = [...form.skills]
    for (const skill of toAdd) {
      if (merged.length >= MAX_PROFILE_SKILLS) break
      if (!merged.some((s) => s.toLowerCase() === skill.toLowerCase())) {
        merged.push(skill)
      }
    }
    onChange({ skills: merged })
    setModalOpen(false)
  }

  return (
    <>
      <Card id="skills" className="edu-card shadow-none scroll-mt-24">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t('skills')}</CardTitle>
          {canAccessAi ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!canSuggest || loading}
              onClick={() => void handleSuggest()}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
              {t('suggest_skills')}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="sr-only">{t('skills')}</Label>
          <SkillsTagInput
            value={form.skills}
            onChange={(skills) => onChange({ skills })}
            max={MAX_PROFILE_SKILLS}
            placeholder={t('skills_placeholder')}
          />
          {form.skills.length < 3 && (
            <p className="text-xs text-muted-foreground">{t('skills_min_hint')}</p>
          )}
          <p className="text-xs text-muted-foreground num-en">
            {form.skills.length}/{MAX_PROFILE_SKILLS}
          </p>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('suggest_skills')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('no_suggestions')}</p>
            ) : (
              suggestions.map((skill) => (
                <label key={skill} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.has(skill)}
                    onCheckedChange={(checked) => {
                      const next = new Set(selected)
                      if (checked) next.add(skill)
                      else next.delete(skill)
                      setSelected(next)
                    }}
                  />
                  {skill}
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" onClick={applySuggestions}>
              {t('add_selected')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
