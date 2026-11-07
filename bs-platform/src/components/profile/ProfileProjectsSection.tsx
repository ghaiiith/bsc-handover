'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SkillsTagInput from '@/components/shared/SkillsTagInput'
import type { ProfileFormState, ProjectItem } from '@/types/profile'

interface ProfileProjectsSectionProps {
  form: ProfileFormState
  onChange: (patch: Partial<ProfileFormState>) => void
}

const emptyProject = (): ProjectItem => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  technologies: [],
})

export default function ProfileProjectsSection({ form, onChange }: ProfileProjectsSectionProps) {
  const t = useTranslations('profile')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ProjectItem>(emptyProject())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const openNew = () => {
    setDraft(emptyProject())
    setOpen(true)
  }

  const openEdit = (item: ProjectItem) => {
    setDraft({ ...item })
    setOpen(true)
  }

  const saveDraft = () => {
    if (!draft.name.trim() || !draft.description.trim()) return
    const exists = form.projects.some((p) => p.id === draft.id)
    const next = exists
      ? form.projects.map((p) => (p.id === draft.id ? draft : p))
      : [...form.projects, draft]
    onChange({ projects: next })
    setOpen(false)
  }

  const deleteItem = (id: string) => {
    if (!confirm(t('confirm_delete'))) return
    onChange({ projects: form.projects.filter((p) => p.id !== id) })
  }

  return (
    <>
      <Card id="projects" className="edu-card shadow-none scroll-mt-24">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('projects')}</CardTitle>
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t('add_project')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_projects')}</p>
          ) : (
            form.projects.map((item) => (
              <div key={item.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p
                      className={`text-sm text-muted-foreground mt-1 ${
                        expandedId === item.id ? '' : 'line-clamp-2'
                      }`}
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      {item.description}
                    </p>
                    {item.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.technologies.map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 mt-2">
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> URL
                        </a>
                      )}
                      {item.github_url && (
                        <a href={item.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> GitHub
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('add_project')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('project_name')}</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Textarea
                rows={4}
                maxLength={500}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('technologies')}</Label>
              <SkillsTagInput
                value={draft.technologies}
                onChange={(technologies) => setDraft({ ...draft, technologies })}
                max={20}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('project_url')}</Label>
              <Input
                value={draft.url ?? ''}
                placeholder="https://"
                onChange={(e) => setDraft({ ...draft, url: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('github_url')}</Label>
              <Input
                value={draft.github_url ?? ''}
                placeholder="https://github.com/..."
                onChange={(e) => setDraft({ ...draft, github_url: e.target.value || undefined })}
              />
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
