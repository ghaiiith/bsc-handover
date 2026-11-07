'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/format-number'
import {
  calculateProfileScore,
  getProfileMissingItems,
} from '@/lib/profile/profile-score'
import type { ProfileFormState } from '@/types/profile'

interface ProfileCompletionCardProps {
  locale: string
  form: ProfileFormState
}

export default function ProfileCompletionCard({ locale, form }: ProfileCompletionCardProps) {
  const t = useTranslations('profile')
  const score = calculateProfileScore(form)
  const missing = getProfileMissingItems(form)
  const complete = score === 100

  return (
    <Card className="edu-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{t('completion')}</span>
          <span className="text-2xl font-bold num-en">{formatCount(score)}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {complete ? (
          <>
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="h-5 w-5" />
              {t('profile_complete')}
            </div>
            <Link
              href={`/${locale}/dashboard/profile`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {t('view_public')}
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t('complete_prompt')}</p>
            <ul className="space-y-2">
              {missing.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/${locale}/dashboard/profile#${item.hash}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/dashboard/profile`}
              className={cn(buttonVariants({ size: 'sm' }), 'w-full')}
            >
              {t('complete_profile_cta')}
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
