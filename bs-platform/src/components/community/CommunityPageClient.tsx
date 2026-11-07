'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import CommunityAISearch from '@/components/community/CommunityAISearch'
import CommunityFilters from '@/components/community/CommunityFilters'
import CommunityFeaturedRow from '@/components/community/CommunityFeaturedRow'
import CommunityHero from '@/components/community/CommunityHero'
import CommunityJoinCta from '@/components/community/CommunityJoinCta'
import TalentCard from '@/components/community/TalentCard'
import type { CommunityMember, CommunityPageData, CommunitySearchResult } from '@/types/community'
import { cn } from '@/lib/utils'

interface CommunityPageClientProps {
  data: CommunityPageData
  isLoggedIn: boolean
  profileScore: number
  meetsCommunityBar: boolean
  /** False for admin/staff accounts — hides the talent-profile completion CTA. */
  profilePromptEligible?: boolean
  portfolioIsPublic: boolean
  portfolioSlug?: string | null
  canViewPortfolios: boolean
  viewerUserId?: string | null
  canAccessAi: boolean
  filters: {
    category?: string
    city?: string
    available?: boolean
    q?: string
    sort?: string
    page?: number
  }
}

export default function CommunityPageClient({
  data,
  isLoggedIn,
  profileScore,
  meetsCommunityBar,
  profilePromptEligible = true,
  portfolioIsPublic,
  portfolioSlug,
  canViewPortfolios,
  viewerUserId,
  canAccessAi,
  filters,
}: CommunityPageClientProps) {
  const t = useTranslations('community')
  const locale = useLocale()
  const [aiResults, setAiResults] = useState<CommunitySearchResult[] | null>(null)

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const currentPage = filters.page ?? 1

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams()
    if (filters.category) params.set('category', filters.category)
    if (filters.city) params.set('city', filters.city)
    if (filters.available) params.set('available', 'true')
    if (filters.q) params.set('q', filters.q)
    if (filters.sort) params.set('sort', filters.sort)
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    return `/${locale}/community${qs ? `?${qs}` : ''}`
  }

  const hideGrid = aiResults != null && aiResults.length > 0
  const showAiResultsOnly = aiResults != null

  return (
    <>
      <CommunityHero stats={data.platformStats}>
        {canAccessAi ? (
          <CommunityAISearch
            isLoggedIn={isLoggedIn}
            embedded
            canViewPortfolios={canViewPortfolios}
            viewerUserId={viewerUserId}
            onResultsChange={(results) => setAiResults(results)}
          />
        ) : null}
      </CommunityHero>

      {showAiResultsOnly ? null : (
        <>
          <CommunityFilters
            categoryStats={data.categoryStats}
            total={data.total}
            current={filters}
          />
          {!hideGrid && (
            <CommunityFeaturedRow
              members={data.featured}
              canViewPortfolios={canViewPortfolios}
              viewerUserId={viewerUserId}
            />
          )}
        </>
      )}

      {!hideGrid && !showAiResultsOnly && (
        <section className="py-10 md:py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4 }}
              className="mb-6 flex items-center gap-2"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground md:text-xl">
                  {t('browse_section')}
                </h2>
                <p className="text-sm text-muted-foreground">{t('browse_section_subtitle')}</p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.members.map((member: CommunityMember) => (
                <TalentCard
                  key={member.id}
                  member={member}
                  canViewPortfolios={canViewPortfolios}
                  viewerUserId={viewerUserId}
                />
              ))}
            </div>

            {data.members.length === 0 && (
              <div className="edu-card rounded-2xl py-20 text-center shadow-none">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <Users className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">{t('no_members')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('no_members_hint')}</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Link
                  href={buildPageHref(currentPage - 1)}
                  aria-disabled={currentPage <= 1}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: cn(
                      'rounded-full',
                      currentPage <= 1 ? 'pointer-events-none opacity-50' : ''
                    ),
                  })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                <span className="min-w-[5rem] rounded-full border bg-card px-4 py-1.5 text-center text-sm text-muted-foreground tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <Link
                  href={buildPageHref(currentPage + 1)}
                  aria-disabled={currentPage >= totalPages}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: cn(
                      'rounded-full',
                      currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''
                    ),
                  })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {profilePromptEligible ? (
        <CommunityJoinCta
          isLoggedIn={isLoggedIn}
          profileScore={profileScore}
          meetsCommunityBar={meetsCommunityBar}
          portfolioIsPublic={portfolioIsPublic}
          portfolioSlug={portfolioSlug}
        />
      ) : null}
    </>
  )
}
