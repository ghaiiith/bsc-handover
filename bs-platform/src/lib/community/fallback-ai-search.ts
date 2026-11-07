import type { CommunityMember, CommunitySearchResult } from '@/types/community'

export function fallbackCommunitySearch(
  query: string,
  members: CommunityMember[]
): CommunitySearchResult[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1)

  if (words.length === 0) return []

  const scored = members
    .map((member) => {
      const haystack = [
        member.full_name,
        member.full_name_ar ?? '',
        member.headline ?? '',
        member.location ?? '',
        ...member.skills,
      ]
        .join(' ')
        .toLowerCase()

      const matchCount = words.filter((word) => haystack.includes(word)).length
      const score = Math.min(100, Math.round((matchCount / words.length) * 100))
      return { member, score }
    })
    .filter((item) => item.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return scored.map(({ member, score }) => ({
    id: member.id,
    full_name: member.full_name,
    full_name_ar: member.full_name_ar,
    avatar_url: member.avatar_url,
    headline: member.headline,
    location: member.location,
    skills: member.skills,
    availability: member.availability,
    portfolio_slug: member.portfolio_slug,
    match_score: score,
    completed_courses_count: member.completed_courses_count,
    has_cv: member.has_cv,
  }))
}
