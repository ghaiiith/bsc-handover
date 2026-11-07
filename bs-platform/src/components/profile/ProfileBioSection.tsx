'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProfileFormState } from '@/types/profile'
import { toast } from 'sonner'

interface ProfileBioSectionProps {
  form: ProfileFormState
  onChange: (patch: Partial<ProfileFormState>) => void
}

export default function ProfileBioSection({ form, onChange }: ProfileBioSectionProps) {
  const t = useTranslations('profile')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDraft, setAiDraft] = useState('')

  const canImprove = form.bio.trim().length >= 30

  const handleImprove = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/profile/improve-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: form.bio,
          headline: form.headline,
          skills: form.skills,
          experience: form.experience,
        }),
      })
      const data = (await res.json()) as { text?: string; error?: string }
      if (!res.ok) {
        toast.error(t('ai_error'))
        return
      }
      setAiDraft(data.text ?? '')
      setAiOpen(true)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <>
      <Card id="bio" className="edu-card shadow-none scroll-mt-24">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t('bio')}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!canImprove || aiLoading}
            onClick={() => void handleImprove()}
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            )}
            {t('improve_with_ai')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="sr-only">{t('bio')}</Label>
          <Textarea
            rows={6}
            maxLength={1000}
            value={form.bio}
            placeholder={t('bio_placeholder')}
            onChange={(e) => onChange({ bio: e.target.value })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {form.bio.length < 50 && form.bio.length > 0 ? (
              <span>{t('bio_min_hint')}</span>
            ) : (
              <span />
            )}
            <span className="num-en">
              {form.bio.length}/1000
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('improve_with_ai')}</DialogTitle>
          </DialogHeader>
          <Textarea rows={8} value={aiDraft} readOnly />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setAiOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={aiLoading}
              onClick={() => void handleImprove()}
            >
              {t('regenerate')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onChange({ bio: aiDraft })
                setAiOpen(false)
              }}
            >
              {t('accept')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
