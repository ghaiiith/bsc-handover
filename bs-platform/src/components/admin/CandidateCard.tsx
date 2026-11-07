'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MapPin, Copy, FileSearch, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AtsScoreCircle from '@/components/cv/AtsScoreCircle'
import { getScoreColor } from '@/lib/cv/ats-utils'
import { formatCount } from '@/lib/format-number'
import type { RankedCandidate } from '@/types/candidates'
import { toast } from 'sonner'

interface CandidateCardProps {
  candidate: RankedCandidate
  onViewProfile: () => void
  onDetailedAnalysis: () => void
}

async function copyEmail(email: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(email)
    toast.success(successMessage)
    return
  } catch {
    const input = document.createElement('input')
    input.value = email
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    toast.success(successMessage)
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export default function CandidateCard({
  candidate,
  onViewProfile,
  onDetailedAnalysis,
}: CandidateCardProps) {
  const t = useTranslations('candidates')
  const [copied, setCopied] = useState(false)
  const accentColor = getScoreColor(candidate.matchScore)

  const handleCopyEmail = async () => {
    await copyEmail(candidate.email, t('email_copied'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const matchedDisplay = candidate.matchedSkills.slice(0, 5)
  const matchedExtra = candidate.matchedSkills.length - matchedDisplay.length
  const missingDisplay = candidate.missingSkills.slice(0, 3)

  return (
    <article
      className="rounded-xl border transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: '#111827',
        borderColor: '#1E293B',
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
      }}
    >
      <div className="p-4 space-y-4">
        <div className="flex gap-3 items-start">
          <div className="relative shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={candidate.avatarUrl} />
              <AvatarFallback>{initials(candidate.name)}</AvatarFallback>
            </Avatar>
            {candidate.availability && (
              <span className="absolute -bottom-1 -end-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-[#111827]" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            {candidate.availability && (
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px] mb-1">
                {t('open_to_work')}
              </Badge>
            )}
            <h3 className="font-bold text-white truncate">{candidate.name}</h3>
            <p className="text-sm text-slate-400 line-clamp-1">{candidate.headline || '—'}</p>
            {candidate.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {candidate.location}
              </p>
            )}
            <p className="text-xs text-slate-500 num-en">
              {formatCount(candidate.yearsExperience)} {t('years_exp')}
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-center">
            <AtsScoreCircle score={candidate.matchScore} animate={false} size={72} />
            <span className="text-xs text-slate-400 num-en mt-0.5">%</span>
          </div>
        </div>

        {matchedDisplay.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">{t('matched_skills')}</p>
            <div className="flex flex-wrap gap-1">
              {matchedDisplay.map((skill) => (
                <Badge
                  key={skill}
                  className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px]"
                >
                  {skill}
                </Badge>
              ))}
              {matchedExtra > 0 && (
                <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-600">
                  +{formatCount(matchedExtra)}
                </Badge>
              )}
            </div>
          </div>
        )}

        {missingDisplay.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5">{t('missing_skills')}</p>
            <div className="flex flex-wrap gap-1">
              {missingDisplay.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-[10px] text-red-400/80 border-red-900/50 bg-red-950/30"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1 border-slate-600 text-slate-200 hover:bg-slate-800"
            onClick={onViewProfile}
          >
            <User className="h-3.5 w-3.5" />
            {t('view_profile')}
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1 bg-orange-600 hover:bg-orange-700 text-white"
            onClick={onDetailedAnalysis}
          >
            <FileSearch className="h-3.5 w-3.5" />
            {t('detailed_analysis')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1 text-slate-400 hover:text-slate-200"
            onClick={() => void handleCopyEmail()}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? t('email_copied') : t('copy_email')}
          </Button>
        </div>
      </div>
    </article>
  )
}
