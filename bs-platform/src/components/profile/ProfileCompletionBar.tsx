'use client'

import { useTranslations } from 'next-intl'
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { getProfileScoreColor } from '@/lib/profile/profile-score'
import { formatCount } from '@/lib/format-number'

interface ProfileCompletionBarProps {
  score: number
  className?: string
}

export default function ProfileCompletionBar({ score, className }: ProfileCompletionBarProps) {
  const t = useTranslations('profile')

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t('completion')}</span>
        <span className="text-muted-foreground num-en">{formatCount(score)}%</span>
      </div>
      <Progress value={score} max={100}>
        <ProgressTrack className="h-2">
          <ProgressIndicator className={cn('h-full', getProfileScoreColor(score))} />
        </ProgressTrack>
      </Progress>
    </div>
  )
}
