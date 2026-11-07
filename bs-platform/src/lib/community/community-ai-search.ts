import 'server-only'

import { buildCandidateForRanking } from '@/lib/admin/candidates/build-candidate'
import { fallbackCommunitySearch } from '@/lib/community/fallback-ai-search'
import { fetchCommunityMembersForAiSearch } from '@/lib/community/get-community-data'
import type { CommunityUserRow } from '@/lib/community/member-eligibility'
import { isCvBuilderConfigured, rankCandidatesWithJob } from '@/lib/cv/cv-builder-server'
import type { CommunitySearchResult } from '@/types/community'
import type { ResumeInput } from '@/types/cv'

function rowToResume(row: CommunityUserRow): ResumeInput {
  const built = buildCandidateForRanking(row)
  return {
    basics: {
      name: built.name,
      label: built.headline,
      location: built.location ? { city: built.location } : undefined,
    },
    skills: built.skills.map((s) => ({ name: s })),
    work: built.experience_titles.map((t) => ({ position: t })),
  }
}

export async function runCommunityAiSearch(
  query: string
): Promise<{ results: CommunitySearchResult[]; isFallback: boolean }> {
  const { members, rows } = await fetchCommunityMembersForAiSearch()
  if (members.length === 0) {
    return { results: [], isFallback: false }
  }

  const memberMap = new Map(members.map((m) => [m.id, m]))

  if (isCvBuilderConfigured()) {
    const candidates = rows.map((row) => ({
      id: row.id,
      resume: rowToResume(row),
    }))

    const rankResult = await rankCandidatesWithJob(query, candidates)
    if (rankResult.ok) {
      const results: CommunitySearchResult[] = rankResult.items
        .filter((item) => item.score >= 40)
        .slice(0, 10)
        .map((item) => {
          const member = memberMap.get(item.id)!
          return {
            id: member.id,
            full_name: member.full_name,
            full_name_ar: member.full_name_ar,
            avatar_url: member.avatar_url,
            headline: member.headline,
            location: member.location,
            skills: member.skills,
            availability: member.availability,
            portfolio_slug: member.portfolio_slug,
            match_score: item.score,
            completed_courses_count: member.completed_courses_count,
            has_cv: member.has_cv,
          }
        })

      return { results, isFallback: false }
    }
  }

  return {
    results: fallbackCommunitySearch(query, members),
    isFallback: true,
  }
}
