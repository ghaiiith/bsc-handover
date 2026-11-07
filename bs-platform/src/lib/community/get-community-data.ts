import 'server-only'

import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCommunityAiSearchCount30d } from '@/lib/community/ai-search-analytics'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureUniqueSlug, generateSlug } from '@/lib/portfolio/generateSlug'
import {
  COMMUNITY_PAGE_SIZE,
  memberMatchesCity,
  memberMatchesSearch,
} from '@/lib/community/constants'
import { getCommunityCategories, type CommunityCategory } from '@/lib/community/categories'
import { getCommunitySettings } from '@/lib/community/community-settings'
import { getCompletedCoursesCounts, getCvUserIds } from '@/lib/community/completed-courses'
import {
  filterCommunityMembers,
  getProfileScoreFromRow,
  type CommunityUserRow,
} from '@/lib/community/member-eligibility'
import type {
  CommunityCategoryStat,
  CommunityFilters,
  CommunityMember,
  CommunityPageData,
  CommunityPlatformStats,
} from '@/types/community'

function toMember(
  row: CommunityUserRow,
  extras: {
    profile_score: number
    completed_courses_count: number
    has_cv: boolean
    is_featured: boolean
  }
): CommunityMember {
  return {
    id: row.id,
    full_name: row.full_name,
    full_name_ar: row.full_name_ar,
    avatar_url: row.avatar_url,
    headline: row.headline,
    location: row.location,
    skills: (row.skills ?? []).map((s) => s.trim()).filter(Boolean),
    availability: Boolean(row.availability),
    preferred_role: row.preferred_role ?? null,
    portfolio_slug: row.portfolio_slug,
    is_verified: Boolean(row.is_verified),
    profile_score: extras.profile_score,
    completed_courses_count: extras.completed_courses_count,
    has_cv: extras.has_cv,
    is_featured: extras.is_featured,
    created_at: row.created_at,
    profile_completed_at: row.profile_completed_at,
  }
}

/**
 * Give every eligible member a portfolio slug so their public profile is
 * reachable. Members can qualify for the community (skills + headline/bio) before
 * they ever open the profile editor that would otherwise mint a slug, so we
 * backfill lazily here. Best-effort and idempotent: a failure just leaves the
 * member without a portfolio link, it never drops them from the listing.
 */
async function ensureCommunitySlugs(
  admin: SupabaseClient,
  rows: CommunityUserRow[]
): Promise<CommunityUserRow[]> {
  const missing = rows.filter((r) => !r.portfolio_slug?.trim())
  if (missing.length === 0) return rows

  const patched = new Map<string, string>()
  for (const row of missing) {
    try {
      const base = generateSlug(row.full_name_ar || row.full_name || 'user', row.full_name || undefined)
      const unique = await ensureUniqueSlug(base, admin)
      const { error } = await admin
        .from('users')
        .update({ portfolio_slug: unique })
        .eq('id', row.id)
        .is('portfolio_slug', null)
      if (!error) patched.set(row.id, unique)
    } catch {
      // best-effort; leave this member without a slug
    }
  }

  if (patched.size === 0) return rows
  return rows.map((r) => (patched.has(r.id) ? { ...r, portfolio_slug: patched.get(r.id)! } : r))
}

async function fetchBaseCommunityRows(): Promise<CommunityUserRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select(
      `id, full_name, full_name_ar, avatar_url, headline, location, skills, availability,
       portfolio_slug, is_verified, bio, preferred_role, experience, education, projects, links,
       years_of_experience, created_at, profile_completed_at`
    )
    .eq('is_active', true)
    .eq('portfolio_is_public', true)
    .eq('onboarding_completed', true)
    // Report BS-46: discovery is for candidates only. Companies (and admins) must
    // never surface here regardless of profile completion — filter by role, not
    // just by the completion bar.
    .in('role', ['student', 'freelancer', 'instructor'])

  const eligible = filterCommunityMembers((data ?? []) as CommunityUserRow[])
  return ensureCommunitySlugs(admin, eligible)
}

async function enrichMembers(
  rows: CommunityUserRow[],
  featuredUserIds: string[]
): Promise<CommunityMember[]> {
  if (rows.length === 0) return []
  const admin = createAdminClient()
  const userIds = rows.map((r) => r.id)
  const [courseCounts, cvIds] = await Promise.all([
    getCompletedCoursesCounts(admin, userIds),
    getCvUserIds(admin, userIds),
  ])
  const featuredSet = new Set(featuredUserIds)

  return rows.map((row) => {
    const profile_score = getProfileScoreFromRow(row)
    return toMember(row, {
      profile_score,
      completed_courses_count: courseCounts.get(row.id) ?? 0,
      has_cv: cvIds.has(row.id),
      is_featured: featuredSet.has(row.id),
    })
  })
}

function sortMembers(members: CommunityMember[], sort: CommunityFilters['sort']): CommunityMember[] {
  const list = [...members]
  switch (sort) {
    case 'most_skills':
      return list.sort((a, b) => b.skills.length - a.skills.length)
    case 'highest_completion':
      return list.sort((a, b) => b.profile_score - a.profile_score)
    case 'most_courses':
      return list.sort((a, b) => b.completed_courses_count - a.completed_courses_count)
    case 'newest':
    default:
      return list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }
}

// A member belongs to a category if they explicitly chose it as their role
// (report BS-19) OR their skills keyword-match the (admin-editable) category.
function memberInCategory(
  m: CommunityMember,
  category: string,
  categories: CommunityCategory[]
): boolean {
  if (!category || category === 'all') return true
  if (m.preferred_role && m.preferred_role === category) return true
  const cat = categories.find((c) => c.value === category)
  if (!cat) return true
  const skills = m.skills.map((s) => s.toLowerCase())
  return cat.keywords.some((kw) => {
    const k = kw.toLowerCase()
    return skills.some((skill) => skill.includes(k) || k.includes(skill))
  })
}

function applyFilters(
  members: CommunityMember[],
  filters: CommunityFilters,
  categories: CommunityCategory[]
): CommunityMember[] {
  return members.filter((m) => {
    if (filters.available && !m.availability) return false
    if (!memberInCategory(m, filters.category ?? 'all', categories)) return false
    if (!memberMatchesCity(m.location, filters.city ?? 'all')) return false
    if (!memberMatchesSearch(m, filters.q ?? '')) return false
    return true
  })
}

function buildCategoryStats(
  members: CommunityMember[],
  categories: CommunityCategory[]
): CommunityCategoryStat[] {
  return categories.map((cat) => ({
    value: cat.value,
    emoji: cat.emoji,
    label: cat.label,
    labelEn: cat.labelEn,
    count: members.filter((m) => memberInCategory(m, cat.value, categories)).length,
  }))
}

function buildPlatformStats(
  members: CommunityMember[],
  categories: CommunityCategory[]
): CommunityPlatformStats {
  const cities = new Set(
    members.map((m) => m.location?.trim()).filter(Boolean) as string[]
  )
  const fieldsWithMembers = categories.filter((cat) =>
    members.some((m) => memberInCategory(m, cat.value, categories))
  ).length

  return {
    totalMembers: members.length,
    fieldsCount: fieldsWithMembers,
    citiesCount: cities.size,
  }
}

const getCachedAllMembers = unstable_cache(
  async () => {
    const rows = await fetchBaseCommunityRows()
    const { featuredUserIds } = await getCommunitySettings()
    return enrichMembers(rows, featuredUserIds)
  },
  ['community-all-members'],
  { revalidate: 300, tags: ['community-members'] }
)

const getCachedPlatformStats = unstable_cache(
  async () => {
    const [members, categories] = await Promise.all([
      getCachedAllMembers(),
      getCommunityCategories(),
    ])
    return buildPlatformStats(members, categories)
  },
  ['community-platform-stats'],
  { revalidate: 3600, tags: ['community-members', 'community-categories'] }
)

export async function fetchCommunityPageData(
  filters: CommunityFilters
): Promise<CommunityPageData> {
  const page = Math.max(1, filters.page ?? 1)
  const [{ featuredUserIds }, allMembers, platformStats, categories] = await Promise.all([
    getCommunitySettings(),
    getCachedAllMembers(),
    getCachedPlatformStats(),
    getCommunityCategories(),
  ])

  const categoryStats = buildCategoryStats(allMembers, categories)
  const filtered = sortMembers(applyFilters(allMembers, filters, categories), filters.sort)
  const total = filtered.length
  const start = (page - 1) * COMMUNITY_PAGE_SIZE
  const members = filtered.slice(start, start + COMMUNITY_PAGE_SIZE)

  const featured = featuredUserIds
    .map((id) => allMembers.find((m) => m.id === id))
    .filter((m): m is CommunityMember => Boolean(m))

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentJoins = allMembers
    .filter((m) => {
      const completedAt = m.profile_completed_at
      if (!completedAt) return false
      return new Date(completedAt).getTime() >= thirtyDaysAgo
    })
    .sort(
      (a, b) =>
        new Date(b.profile_completed_at ?? 0).getTime() -
        new Date(a.profile_completed_at ?? 0).getTime()
    )
    .slice(0, 8)

  return {
    members,
    total,
    page,
    pageSize: COMMUNITY_PAGE_SIZE,
    categoryStats,
    platformStats,
    featured,
    recentJoins,
    featuredUserIds,
  }
}

export async function fetchCommunityMembersForAdmin(): Promise<CommunityMember[]> {
  const rows = await fetchBaseCommunityRows()
  const { featuredUserIds } = await getCommunitySettings()
  const members = await enrichMembers(rows, featuredUserIds)
  return sortMembers(members, 'newest')
}

export async function searchCommunityMembersForAdmin(
  query: string
): Promise<CommunityMember[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const members = await fetchCommunityMembersForAdmin()
  return members.filter((m) => memberMatchesSearch(m, q)).slice(0, 20)
}

export async function fetchCommunityAdminStats(): Promise<{
  totalMembers: number
  availableCount: number
  aiSearchCount30d: number
}> {
  const [members, aiSearchCount30d] = await Promise.all([
    fetchCommunityMembersForAdmin(),
    getCommunityAiSearchCount30d(),
  ])
  return {
    totalMembers: members.length,
    availableCount: members.filter((m) => m.availability).length,
    aiSearchCount30d,
  }
}

export async function fetchCommunityMembersForAiSearch(): Promise<{
  members: CommunityMember[]
  rows: CommunityUserRow[]
}> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select(
      `id, full_name, full_name_ar, avatar_url, headline, location, skills, availability,
       portfolio_slug, is_verified, bio, preferred_role, experience, education, projects, links,
       years_of_experience, created_at, profile_completed_at`
    )
    .eq('is_active', true)
    .eq('portfolio_is_public', true)
    .eq('onboarding_completed', true)
    .order('created_at', { ascending: false })
    .limit(200)

  const eligible = (
    await ensureCommunitySlugs(
      admin,
      filterCommunityMembers((data ?? []) as CommunityUserRow[])
    )
  ).slice(0, 100)
  const { featuredUserIds } = await getCommunitySettings()
  const members = await enrichMembers(eligible, featuredUserIds)
  return { members, rows: eligible }
}
