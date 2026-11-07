'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  Award,
  BookOpen,
  Download,
  Globe,
  GraduationCap,
  Link2,
  MapPin,
  Presentation,
  Share2,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadPortfolioCv } from '@/lib/cv/cv-client-utils'
import { shareToWhatsApp } from '@/lib/share/whatsapp'
import { formatCount } from '@/lib/format-number'
import { cn } from '@/lib/utils'
import PortfolioReveal from '@/components/portfolio/PortfolioReveal'
import { usePortfolioTheme } from '@/components/portfolio/PortfolioThemeProvider'
import type { PortfolioUser } from '@/types/portfolio'
import { toast } from 'sonner'

interface PortfolioHeroProps {
  locale: string
  user: PortfolioUser
  hasDefaultCv: boolean
  portfolioUrl: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function PortfolioHero({
  locale,
  user,
  hasDefaultCv,
  portfolioUrl,
}: PortfolioHeroProps) {
  const t = useTranslations('portfolio')
  const { theme, isInstructor, stats } = usePortfolioTheme()
  const isAr = locale === 'ar'
  const [bioExpanded, setBioExpanded] = useState(false)
  const [downloadingCv, setDownloadingCv] = useState(false)

  const displayName = isAr ? user.full_name_ar ?? user.full_name : user.full_name
  const bio = (isAr ? user.bio_ar ?? user.bio : user.bio) ?? ''
  const memberYear = new Date(user.created_at).getFullYear()

  // Report BS-93: this used to only copy the link — no WhatsApp window ever
  // opened and nothing was sent. Now it opens a real share flow and says why
  // when the browser blocks it, so the user has something to act on.
  const handleWhatsAppShare = async () => {
    const result = await shareToWhatsApp({
      text: t('share_message', { name: displayName ?? '' }),
      url: portfolioUrl,
    })
    if (result.ok || result.reason === 'cancelled') return
    toast.error(result.reason === 'blocked' ? t('share_blocked') : t('error_fallback'))
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portfolioUrl)
      toast.success(t('link_copied'))
    } catch {
      toast.error(t('copy_failed'))
    }
  }

  // Report BS-101: the download could fail with no explanation and no way to
  // try again. The button is already click-guarded by `downloadingCv`; this
  // adds a specific reason and a retry action for the recoverable cases.
  const handleDownloadCv = async () => {
    if (downloadingCv) return
    setDownloadingCv(true)
    try {
      const result = await downloadPortfolioCv(user.id)
      if (result.ok) return

      if (result.error === 'no_cv') {
        toast.error(t('no_cv'))
        return
      }

      const retryable =
        result.error === 'network' ||
        result.error === 'rate_limited' ||
        result.error === 'export_failed' ||
        result.error === 'pdf_generation_failed'

      toast.error(
        result.error === 'rate_limited' ? t('cv_rate_limited') : t('cv_download_failed'),
        retryable
          ? { action: { label: t('retry'), onClick: () => void handleDownloadCv() } }
          : undefined
      )
    } finally {
      setDownloadingCv(false)
    }
  }

  const links = user.links ?? {}

  const statItems = isInstructor
    ? [
        { icon: BookOpen, label: t('stat_taught_courses'), value: stats.taughtCoursesCount },
        { icon: Users, label: t('stat_students'), value: stats.totalStudents },
        {
          icon: Star,
          label: t('stat_avg_rating'),
          value: stats.avgCourseRating > 0 ? stats.avgCourseRating.toFixed(1) : '—',
        },
        { icon: Award, label: t('stat_certificates'), value: stats.certificatesCount },
      ]
    : [
        { icon: GraduationCap, label: t('stat_completed'), value: stats.completedCoursesCount },
        { icon: Award, label: t('stat_certificates'), value: stats.certificatesCount },
        { icon: Sparkles, label: t('stat_skills'), value: stats.skillsCount },
        { icon: BookOpen, label: t('stat_projects'), value: stats.projectsCount },
      ]

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 md:pt-14">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 max-w-3xl rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${theme.accentMuted}, transparent 70%)` }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <PortfolioReveal>
          <motion.span
            className={cn(
              'mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-wider',
              theme.badgeClass
            )}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            {isInstructor ? <Presentation className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isInstructor ? t('badge_instructor') : t('badge_student')}
          </motion.span>
        </PortfolioReveal>

        <PortfolioReveal delay={0.05}>
          <motion.div
            className={cn('relative mx-auto mb-8 h-[132px] w-[132px]', theme.heroGlow)}
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div
              className={cn(
                'absolute inset-0 rounded-full bg-gradient-to-br p-[3px]',
                theme.ringGradient
              )}
            >
              <div className="relative h-full w-full overflow-hidden rounded-full bg-[#0A0F1E]">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="132px"
                    priority
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-3xl font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${theme.accent}33, ${theme.secondary}22)`,
                    }}
                  >
                    {initials(displayName)}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </PortfolioReveal>

        <PortfolioReveal delay={0.1}>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
            {displayName}
          </h1>
        </PortfolioReveal>

        {user.headline && (
          <PortfolioReveal delay={0.15}>
            <p className="mx-auto mb-5 max-w-xl text-lg text-slate-400">{user.headline}</p>
          </PortfolioReveal>
        )}

        <PortfolioReveal delay={0.2}>
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-400">
            {user.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                {user.location}
              </span>
            )}
            {user.years_of_experience != null && user.years_of_experience > 0 && (
              <span className="num-en">
                · {formatCount(user.years_of_experience)} {t('years_experience')}
              </span>
            )}
            {user.availability && (
              <span className="font-medium" style={{ color: theme.accent }}>
                {t('open_to_work')}
              </span>
            )}
          </div>
        </PortfolioReveal>

        {bio && (
          <PortfolioReveal delay={0.25}>
            <div className="mx-auto mb-8 max-w-2xl">
              <p
                className={cn(
                  'leading-relaxed text-slate-300',
                  !bioExpanded && 'line-clamp-3'
                )}
              >
                {bio}
              </p>
              {bio.length > 180 && (
                <button
                  type="button"
                  onClick={() => setBioExpanded((v) => !v)}
                  className="mt-2 text-sm transition-opacity hover:opacity-80"
                  style={{ color: theme.accent }}
                >
                  {bioExpanded ? t('show_less') : t('show_more')}
                </button>
              )}
            </div>
          </PortfolioReveal>
        )}

        <PortfolioReveal delay={0.3}>
          <div
            className={cn(
              'mx-auto mb-8 grid max-w-2xl grid-cols-2 gap-3 rounded-2xl border p-4 md:grid-cols-4',
              theme.cardBorder,
              theme.cardBg
            )}
          >
            {statItems.map((item, i) => (
              <motion.div
                key={item.label}
                className="text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
              >
                <item.icon
                  className="mx-auto mb-1.5 h-4 w-4"
                  style={{ color: theme.accent }}
                />
                <p className="num-en text-xl font-bold text-white">{item.value}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </PortfolioReveal>

        <PortfolioReveal delay={0.35}>
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {links.linkedin && (
              <SocialLink href={links.linkedin} label="LinkedIn" themeAccent={theme.accent} />
            )}
            {links.github && (
              <SocialLink href={links.github} label="GitHub" themeAccent={theme.accent} />
            )}
            {links.website && (
              <SocialLink href={links.website} label="Website" themeAccent={theme.accent} icon={Globe} />
            )}
            {links.twitter && (
              <SocialLink href={links.twitter} label="Twitter" themeAccent={theme.accent} />
            )}
          </div>
        </PortfolioReveal>

        <PortfolioReveal delay={0.4}>
          <div className="flex flex-wrap justify-center gap-3">
            {hasDefaultCv && (
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-current hover:bg-white/5"
                style={{ borderColor: theme.accent, color: theme.accent }}
                disabled={downloadingCv}
                onClick={() => void handleDownloadCv()}
              >
                <Download className="h-4 w-4" />
                {t('download_cv')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => void handleWhatsAppShare()}
            >
              <Share2 className="h-4 w-4" />
              {t('share_whatsapp')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => void handleCopyLink()}
            >
              <Link2 className="h-4 w-4" />
              {t('share_profile')}
            </Button>
          </div>
        </PortfolioReveal>

        <p className="mt-10 text-xs text-slate-600">
          {t('member_since')} <span className="num-en">{memberYear}</span>
        </p>
      </div>
    </section>
  )
}

function SocialLink({
  href,
  label,
  themeAccent,
  icon: Icon = Link2,
}: {
  href: string
  label: string
  themeAccent: string
  icon?: typeof Link2
}) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 backdrop-blur-sm transition-colors"
      whileHover={{ scale: 1.08, borderColor: themeAccent, color: themeAccent }}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </motion.a>
  )
}
