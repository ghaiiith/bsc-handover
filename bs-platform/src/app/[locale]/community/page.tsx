import type { Metadata } from 'next'
import AppNavbar from '@/components/shared/AppNavbar'
import CommunityPageClient from '@/components/community/CommunityPageClient'
import CommunityComingSoon from '@/components/community/CommunityComingSoon'
import { getSessionProfile } from '@/lib/auth/profile'
import { getViewerRole } from '@/lib/auth/get-viewer-role'
import { canAccessAiFeatures, isPrivilegedRole } from '@/lib/auth/role-capabilities'
import { isCommunityVisible } from '@/lib/community/community-settings'
import { fetchCommunityPageData } from '@/lib/community/get-community-data'
import { calculateProfileScore } from '@/lib/profile/profile-score'
import { meetsCommunityThreshold } from '@/lib/community/constants'
import { userProfileToFormState } from '@/lib/profile/profile-merge'
import type { CommunityFilters } from '@/types/community'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === 'ar'
  return {
    title: isAr ? 'مجتمع المواهب' : 'Talent Community',
    description: isAr
      ? 'اكتشف أبرز المواهب العراقية في البرمجة والتصميم وتقنية المعلومات'
      : 'Discover top Iraqi talent in programming, design, and IT',
    robots: { index: true, follow: true },
  }
}

interface CommunityPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function parseFilters(
  raw: Record<string, string | string[] | undefined>
): CommunityFilters {
  const get = (key: string) => {
    const v = raw[key]
    return typeof v === 'string' ? v : undefined
  }

  const page = parseInt(get('page') ?? '1', 10)
  const sort = get('sort') as CommunityFilters['sort']

  return {
    category: get('category'),
    city: get('city'),
    available: get('available') === 'true',
    q: get('q'),
    sort:
      sort === 'most_skills' ||
      sort === 'highest_completion' ||
      sort === 'most_courses'
        ? sort
        : 'newest',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const visible = await isCommunityVisible()
  if (!visible) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <CommunityComingSoon />
      </div>
    )
  }

  const resolved = await searchParams
  const filters = parseFilters(resolved)
  const [data, session, viewer] = await Promise.all([
    fetchCommunityPageData(filters),
    getSessionProfile(),
    getViewerRole(),
  ])

  const profile = session?.profile
  const profileForm = profile ? userProfileToFormState(profile) : null
  const profileScore = profileForm ? calculateProfileScore(profileForm) : 0
  // Report BS-67/68: same score-based rule the Community query uses.
  const meetsCommunityBar = profileForm
    ? meetsCommunityThreshold(calculateProfileScore(profileForm))
    : false

  const canViewPortfolios = isPrivilegedRole(viewer.role)
  const canAccessAi = canAccessAiFeatures(viewer.role)

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <CommunityPageClient
        data={data}
        isLoggedIn={Boolean(session)}
        profileScore={profileScore}
        meetsCommunityBar={meetsCommunityBar}
        profilePromptEligible={viewer.role !== 'admin'}
        portfolioIsPublic={profile?.portfolio_is_public !== false}
        portfolioSlug={profile?.portfolio_slug}
        canViewPortfolios={canViewPortfolios}
        viewerUserId={viewer.userId}
        canAccessAi={canAccessAi}
        filters={{
          category: filters.category,
          city: filters.city,
          available: filters.available,
          q: filters.q,
          sort: filters.sort,
          page: filters.page,
        }}
      />
    </div>
  )
}
