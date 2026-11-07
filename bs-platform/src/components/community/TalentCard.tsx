'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowRight,
  Briefcase,
  FileText,
  GraduationCap,
  MapPin,
  Star,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import VerifiedBadge from '@/components/shared/VerifiedBadge'
import { cn } from '@/lib/utils'
import { displayName, getAvatarGradient, getInitials } from '@/lib/community/avatar-utils'
import type { CommunityMember, CommunitySearchResult } from '@/types/community'

type TalentCardData = CommunityMember | CommunitySearchResult

interface TalentCardProps {
  member: TalentCardData
  featured?: boolean
  matchScore?: number
  className?: string
  layout?: 'grid' | 'strip'
  canViewPortfolios?: boolean
  viewerUserId?: string | null
}

function ProfileScoreRing({
  score,
  size,
  children,
}: {
  score: number
  size: number
  children: React.ReactNode
}) {
  const stroke = 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, score) / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/50"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div
        className="absolute flex items-center justify-center rounded-full"
        style={{ inset: stroke + 2 }}
      >
        {children}
      </div>
    </div>
  )
}

export default function TalentCard({
  member,
  featured = false,
  matchScore,
  className,
  layout = 'grid',
  canViewPortfolios = false,
  viewerUserId = null,
}: TalentCardProps) {
  const t = useTranslations('community')
  const locale = useLocale()
  const name = displayName(member.full_name, member.full_name_ar, locale)
  const skills = member.skills ?? []
  const visibleSkills = skills.slice(0, layout === 'strip' ? 2 : 3)
  const extraCount = Math.max(0, skills.length - visibleSkills.length)
  const remainingSkills = skills.slice(visibleSkills.length)
  const profileScore =
    'profile_score' in member && member.profile_score > 0 ? member.profile_score : null
  const isFeatured = featured || ('is_featured' in member && member.is_featured)
  const avatarInnerSize = layout === 'strip' ? 56 : isFeatured ? 72 : 64
  const ringSize = avatarInnerSize + 10
  const showPortfolioLink =
    Boolean(member.portfolio_slug) &&
    (canViewPortfolios || (viewerUserId != null && member.id === viewerUserId))

  const avatar = (
    <Avatar className="size-full">
      {member.avatar_url ? (
        <AvatarImage src={member.avatar_url} alt={name} className="object-cover" />
      ) : null}
      <AvatarFallback
        className={cn(
          'bg-gradient-to-br text-sm font-semibold text-white',
          getAvatarGradient(name)
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )

  if (layout === 'strip') {
    return (
      <article
        className={cn(
          'edu-card group relative flex h-full gap-4 p-4 shadow-none',
          isFeatured && 'border-primary/25 bg-gradient-to-br from-primary/[0.04] to-transparent',
          className
        )}
      >
        {isFeatured && (
          <span className="absolute -top-2.5 start-4 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
            <Star className="size-3 fill-current" />
            {t('featured_badge')}
          </span>
        )}

        <div className="relative shrink-0 pt-1">
          {profileScore != null ? (
            <ProfileScoreRing score={profileScore} size={ringSize}>
              {avatar}
            </ProfileScoreRing>
          ) : (
            <div
              className="overflow-hidden rounded-full ring-2 ring-primary/15"
              style={{ width: avatarInnerSize, height: avatarInnerSize }}
            >
              {avatar}
            </div>
          )}
          {member.availability && (
            <span
              className="absolute bottom-0 end-0 size-3 rounded-full border-2 border-card bg-emerald-500"
              title={t('available_badge')}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="flex items-center gap-1 truncate font-semibold text-foreground">
            <span className="truncate">{name}</span>
            {'is_verified' in member && member.is_verified ? (
              <VerifiedBadge className="shrink-0" />
            ) : null}
          </h3>
          {member.headline && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{member.headline}</p>
          )}
          {member.location && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3 shrink-0 text-primary/70" />
              <span className="truncate">{member.location}</span>
            </p>
          )}
          {visibleSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {visibleSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-foreground/80"
                >
                  {skill}
                </span>
              ))}
              {extraCount > 0 && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {t('more_skills', { count: extraCount })}
                </span>
              )}
            </div>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-2">
            {showPortfolioLink ? (
              <Link
                href={`/${locale}/portfolio/${member.portfolio_slug}`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'w-fit gap-1 border-primary/25 text-primary hover:bg-primary hover:text-primary-foreground'
                )}
              >
                {t('view_portfolio')}
                <ArrowRight className="size-3" />
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">{t('profile_only_hint')}</p>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className={cn(
        'edu-card group relative flex h-full flex-col p-5 shadow-none',
        isFeatured && 'border-primary/20 bg-gradient-to-b from-primary/[0.05] to-card',
        className
      )}
    >
      {isFeatured && (
        <span className="absolute -top-2.5 start-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
          <Star className="size-3 fill-current" />
          {t('featured_badge')}
        </span>
      )}

      {matchScore != null && (
        <span className="absolute top-3 end-3 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-400">
          {matchScore}% {t('match_score')}
        </span>
      )}

      <div className="flex flex-1 flex-col items-center text-center">
        <div className="relative mb-4 mt-1">
          {profileScore != null ? (
            <ProfileScoreRing score={profileScore} size={ringSize}>
              {avatar}
            </ProfileScoreRing>
          ) : (
            <div
              className="overflow-hidden rounded-full ring-4 ring-primary/10 transition-all group-hover:ring-primary/20"
              style={{ width: avatarInnerSize, height: avatarInnerSize }}
            >
              {avatar}
            </div>
          )}
          {member.availability && (
            <span
              className="absolute bottom-0.5 end-0.5 size-3.5 rounded-full border-2 border-card bg-emerald-500"
              title={t('available_badge')}
            />
          )}
        </div>

        <h3 className="line-clamp-1 text-base font-semibold text-foreground">{name}</h3>

        {member.headline ? (
          <p className="mt-1 flex min-h-[2.5rem] items-center justify-center gap-1 text-sm text-muted-foreground line-clamp-2">
            <Briefcase className="size-3.5 shrink-0 opacity-60" aria-hidden />
            <span>{member.headline}</span>
          </p>
        ) : (
          <div className="min-h-[2.5rem]" />
        )}

        {member.location && (
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-primary/70" aria-hidden />
            <span className="line-clamp-1">{member.location}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {member.availability && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {t('available_badge')}
            </span>
          )}
          {profileScore != null && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {profileScore}%
            </span>
          )}
        </div>

        {visibleSkills.length > 0 && (
          <div className="mt-3 flex w-full flex-wrap justify-center gap-1.5">
            {visibleSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-0.5 text-xs text-foreground/80"
              >
                {skill}
              </span>
            ))}
            {extraCount > 0 && (
              <span
                className="group/skill relative cursor-default rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                title={remainingSkills.join(', ')}
              >
                +{extraCount}
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow-lg group-hover/skill:block">
                  {remainingSkills.join(', ')}
                </span>
              </span>
            )}
          </div>
        )}

        {(member.completed_courses_count > 0 || member.has_cv) && (
          <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {member.completed_courses_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="size-3.5" />
                {member.completed_courses_count} {t('courses_completed')}
              </span>
            )}
            {member.has_cv && (
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3.5" />
                {t('cv_ready')}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {showPortfolioLink ? (
          <Link
            href={`/${locale}/portfolio/${member.portfolio_slug}`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground'
            )}
          >
            {t('view_portfolio')}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <p className="flex-1 text-center text-xs text-muted-foreground">{t('profile_only_hint')}</p>
        )}
      </div>
    </article>
  )
}
