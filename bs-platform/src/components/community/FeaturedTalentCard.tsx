'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowRight,
  Briefcase,
  FileText,
  GraduationCap,
  MapPin,
  Sparkles,
  Star,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { displayName, getAvatarGradient, getInitials } from '@/lib/community/avatar-utils'
import type { CommunityMember } from '@/types/community'

interface FeaturedTalentCardProps {
  member: CommunityMember
  className?: string
  canViewPortfolios?: boolean
  viewerUserId?: string | null
}

export default function FeaturedTalentCard({
  member,
  className,
  canViewPortfolios = false,
  viewerUserId = null,
}: FeaturedTalentCardProps) {
  const t = useTranslations('community')
  const locale = useLocale()
  const name = displayName(member.full_name, member.full_name_ar, locale)
  const skills = member.skills ?? []
  const visibleSkills = skills.slice(0, 2)
  const extraCount = Math.max(0, skills.length - visibleSkills.length)
  const profileScore = member.profile_score > 0 ? member.profile_score : null
  const showPortfolioLink =
    Boolean(member.portfolio_slug) &&
    (canViewPortfolios || (viewerUserId != null && member.id === viewerUserId))

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-primary/15 bg-card',
        'shadow-[0_4px_24px_-8px_rgba(234,88,12,0.12)] transition-all duration-300',
        'hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_12px_32px_-10px_rgba(234,88,12,0.2)]',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.08] via-primary/[0.03] to-transparent"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-2 px-4 pt-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
          <Star className="size-3 fill-current" />
          {t('featured_badge')}
        </span>
        {member.availability && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {t('available_badge')}
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col items-center px-4 pb-4 pt-3 text-center">
        <div className="relative mb-3">
          <div className="rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-brand-green/15 p-[3px] shadow-inner">
            <Avatar className="size-[4.5rem] border-2 border-card shadow-sm">
              {member.avatar_url ? (
                <AvatarImage src={member.avatar_url} alt={name} className="object-cover" />
              ) : null}
              <AvatarFallback
                className={cn(
                  'bg-gradient-to-br text-base font-semibold text-white',
                  getAvatarGradient(name)
                )}
              >
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          </div>
          {profileScore != null && (
            <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-card bg-background px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
              <Sparkles className="size-2.5" />
              {profileScore}%
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-foreground">
          {name}
        </h3>

        {member.headline ? (
          <p className="mt-1 flex w-full items-start justify-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="mt-0.5 size-3 shrink-0 opacity-60" aria-hidden />
            <span className="line-clamp-2 text-start">{member.headline}</span>
          </p>
        ) : null}

        {member.location && (
          <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0 text-primary/80" aria-hidden />
            <span className="line-clamp-1">{member.location}</span>
          </p>
        )}

        {visibleSkills.length > 0 && (
          <div className="mt-3 flex w-full flex-wrap justify-center gap-1.5">
            {visibleSkills.map((skill, index) => (
              <span
                key={skill}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                  index === 0
                    ? 'bg-primary/10 text-primary'
                    : 'bg-sky-500/10 text-sky-800 dark:text-sky-300'
                )}
              >
                {skill}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t('more_skills', { count: extraCount })}
              </span>
            )}
          </div>
        )}

        {(member.completed_courses_count > 0 || member.has_cv) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground">
            {member.completed_courses_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="size-3" />
                {member.completed_courses_count} {t('courses_completed')}
              </span>
            )}
            {member.has_cv && (
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3" />
                {t('cv_ready')}
              </span>
            )}
          </div>
        )}

        {showPortfolioLink ? (
          <Link
            href={`/${locale}/portfolio/${member.portfolio_slug}`}
            className={cn(
              'mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold',
              'bg-primary text-primary-foreground shadow-sm transition-colors',
              'hover:bg-primary/90 group-hover:shadow-md'
            )}
          >
            {t('view_portfolio')}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </Link>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">{t('profile_only_hint')}</p>
        )}
      </div>
    </article>
  )
}
