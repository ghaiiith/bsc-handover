'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { MapPin, Briefcase, BadgeCheck, Radio, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  formatRelativeDate,
  formatSalaryRange,
  getJobTypeLabel,
  isDeadlinePassed,
  jobTypeStyles,
} from '@/lib/jobs/job-utils'
import type { Job } from '@/types'

interface JobCardProps {
  job: Job
  locale: string
}

export default function JobCard({ job, locale }: JobCardProps) {
  const t = useTranslations('jobs')
  const isAr = locale === 'ar'
  const title = isAr ? job.title_ar : job.title
  const deadlinePassed = isDeadlinePassed(job.deadline)
  const visibleSkills = job.skills.slice(0, 3)
  const extraSkills = job.skills.length - 3

  return (
    <Link href={`/${locale}/jobs/${job.id}`} className="group block h-full">
      <Card
        className={cn(
          'h-full transition-shadow hover:shadow-md',
          job.is_featured && 'border-amber-400/60 ring-1 ring-amber-300/50'
        )}
      >
        <CardContent className="space-y-4 p-5">
          <div>
            {/* Round 9 (BS-111): the featured label must be unmistakable. */}
            {job.is_featured && (
              <Badge className="mb-2 me-2 gap-1 bg-amber-500 text-[11px] text-white hover:bg-amber-500">
                <Star className="h-3 w-3 fill-current" />
                {t('featured_job')}
              </Badge>
            )}
            {/* Say where the listing came from: posted here vs pulled from a
                channel. The two are held to different standards. */}
            <Badge
              variant={job.is_external ? 'outline' : 'secondary'}
              className={cn(
                'mb-2 gap-1 text-[11px]',
                !job.is_external && 'bg-primary/10 text-primary'
              )}
            >
              {job.is_external ? (
                <Radio className="h-3 w-3" />
              ) : (
                <BadgeCheck className="h-3 w-3" />
              )}
              {job.is_external ? t('source_external') : t('source_platform')}
            </Badge>
            <p className="font-bold text-base">{job.company_name}</p>
            <h3 className="mt-1 line-clamp-2 font-semibold leading-snug group-hover:text-primary">
              {title}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              {job.city}
            </Badge>
            <Badge className={cn(jobTypeStyles[job.job_type], 'gap-1')} variant="secondary">
              <Briefcase className="h-3 w-3" />
              {getJobTypeLabel(job.job_type, t)}
            </Badge>
          </div>

          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {extraSkills > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{extraSkills}
                </Badge>
              )}
            </div>
          )}

          <p className="text-sm font-medium text-primary">
            {formatSalaryRange(job, t('salary_tbd'))}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {deadlinePassed ? (
                <span className="text-destructive font-medium">
                  {t('deadline_passed')}
                </span>
              ) : job.deadline ? (
                new Date(job.deadline).toLocaleDateString(
                  isAr ? 'ar-IQ' : 'en-US'
                )
              ) : null}
            </span>
            <span>{formatRelativeDate(job.created_at, locale)}</span>
          </div>

          <span
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'w-full pointer-events-none'
            )}
          >
            {t('view_details')}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
