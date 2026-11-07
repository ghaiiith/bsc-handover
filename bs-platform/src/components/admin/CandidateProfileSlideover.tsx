'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCount } from '@/lib/format-number'
import type { RankedCandidate } from '@/types/candidates'
import type { ExperienceItem } from '@/types/profile'
import { cn } from '@/lib/utils'

interface CandidatesPrivacyNoticeProps {
  onDismiss: () => void
}

export default function CandidatesPrivacyNotice({ onDismiss }: CandidatesPrivacyNoticeProps) {
  const t = useTranslations('candidates')

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <h3 className="font-semibold text-sm">{t('privacy_title')}</h3>
      <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
        <li>{t('privacy_line1')}</li>
        <li>{t('privacy_line2')}</li>
        <li>{t('privacy_line3')}</li>
        <li>{t('privacy_line4')}</li>
      </ul>
      <Button type="button" size="sm" onClick={onDismiss}>
        {t('privacy_understood')}
      </Button>
    </div>
  )
}

export function usePrivacyNoticeDismissed(): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem('eduwork_candidates_notice_dismissed') === 'true')
    } catch {
      setDismissed(false)
    }
    setChecked(true)
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem('eduwork_candidates_notice_dismissed', 'true')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return [checked && dismissed, dismiss]
}

interface CandidateProfileSlideoverProps {
  candidate: RankedCandidate | null
  jobSkills: string[]
  onClose: () => void
  onDetailedAnalysis: () => void
  onCopyEmail: () => void
}

function isSkillMatched(skill: string, jobSkills: string[]): boolean {
  const s = skill.toLowerCase()
  return jobSkills.some((j) => {
    const js = j.toLowerCase()
    return s === js || s.includes(js) || js.includes(s)
  })
}

function formatExperienceDates(item: ExperienceItem): string {
  const end = item.is_current ? 'Present' : item.end_date ?? ''
  return [item.start_date, end].filter(Boolean).join(' — ')
}

export function CandidateProfileSlideover({
  candidate,
  jobSkills,
  onClose,
  onDetailedAnalysis,
  onCopyEmail,
}: CandidateProfileSlideoverProps) {
  const t = useTranslations('candidates')
  const [tab, setTab] = useState<'skills' | 'education' | 'projects'>('skills')

  useEffect(() => {
    if (candidate) setTab('skills')
  }, [candidate])

  if (!candidate) return null

  const initials = candidate.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <aside
        className={cn(
          'fixed top-0 bottom-0 z-50 w-full max-w-md bg-background border shadow-2xl flex flex-col',
          'end-0 animate-in slide-in-from-right duration-300 rtl:slide-in-from-left'
        )}
      >
        <div className="flex items-start gap-3 p-4 border-b shrink-0">
          <Avatar className="h-16 w-16">
            <AvatarImage src={candidate.avatarUrl} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{candidate.name}</h2>
            <p className="text-sm text-muted-foreground line-clamp-2">{candidate.headline}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {candidate.location}
              {candidate.yearsExperience > 0 && (
                <span className="num-en ms-2">
                  · {formatCount(candidate.yearsExperience)} {t('years_exp')}
                </span>
              )}
            </p>
            {candidate.availability && (
              <Badge className="mt-2 bg-green-600/20 text-green-700 dark:text-green-400 text-[10px]">
                {t('open_to_work')}
              </Badge>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex border-b shrink-0">
          {(['skills', 'education', 'projects'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors',
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t(`tab_${key}`)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'skills' && (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('tab_skills')}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant={isSkillMatched(skill, jobSkills) ? 'default' : 'secondary'}
                      className={cn(
                        isSkillMatched(skill, jobSkills) && 'bg-green-600 hover:bg-green-600'
                      )}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('experience_section')}</h4>
                {candidate.experience.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-3">
                    {candidate.experience.map((exp) => (
                      <li key={exp.id} className="border-s-2 border-muted ps-3">
                        <p className="font-medium text-sm">{exp.title}</p>
                        <p className="text-xs text-muted-foreground">{exp.company}</p>
                        <p className="text-xs text-muted-foreground num-en">
                          {formatExperienceDates(exp)}
                        </p>
                        {exp.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {exp.description.slice(0, 100)}
                            {exp.description.length > 100 ? '…' : ''}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {tab === 'education' && (
            <div className="space-y-3">
              {candidate.education.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                candidate.education.map((edu) => (
                  <div key={edu.id} className="rounded-lg border p-3">
                    <p className="font-medium text-sm">{edu.institution}</p>
                    <p className="text-xs text-muted-foreground">
                      {edu.degree} · {edu.field}
                    </p>
                    <p className="text-xs text-muted-foreground num-en">
                      {edu.start_year}
                      {edu.end_year ? ` — ${edu.end_year}` : edu.is_current ? ' — Present' : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'projects' && (
            <div className="space-y-3">
              {candidate.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                candidate.projects.map((proj) => (
                  <div key={proj.id} className="rounded-lg border p-3 space-y-1">
                    <p className="font-medium text-sm">{proj.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{proj.description}</p>
                    {proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {proj.technologies.map((tech) => (
                          <Badge key={tech} variant="outline" className="text-[10px]">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="border-t p-4 flex flex-wrap gap-2 shrink-0 bg-muted/30">
          <Button
            type="button"
            className="bg-orange-600 hover:bg-orange-700"
            onClick={onDetailedAnalysis}
          >
            {t('detailed_analysis')}
          </Button>
          <Button type="button" variant="outline" onClick={onCopyEmail}>
            {t('copy_email')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      </aside>
    </>
  )
}
