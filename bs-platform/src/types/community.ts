export interface CommunityMember {
  id: string
  full_name: string
  full_name_ar?: string | null
  avatar_url?: string | null
  headline?: string | null
  location?: string | null
  skills: string[]
  availability: boolean
  preferred_role?: string | null
  portfolio_slug: string | null
  is_verified: boolean
  profile_score: number
  completed_courses_count: number
  has_cv: boolean
  is_featured: boolean
  created_at: string
  profile_completed_at?: string | null
}

export interface CommunityCategoryStat {
  value: string
  emoji: string
  label: string
  labelEn: string
  count: number
}

export interface CommunityPlatformStats {
  totalMembers: number
  fieldsCount: number
  citiesCount: number
}

export interface CommunityFilters {
  category?: string
  city?: string
  available?: boolean
  q?: string
  sort?: 'newest' | 'most_skills' | 'highest_completion' | 'most_courses'
  page?: number
}

export interface CommunitySearchResult {
  id: string
  full_name: string
  full_name_ar?: string | null
  avatar_url?: string | null
  headline?: string | null
  location?: string | null
  skills: string[]
  availability: boolean
  portfolio_slug: string | null
  match_score: number
  completed_courses_count: number
  has_cv: boolean
}

export interface CommunityPageData {
  members: CommunityMember[]
  total: number
  page: number
  pageSize: number
  categoryStats: CommunityCategoryStat[]
  platformStats: CommunityPlatformStats
  featured: CommunityMember[]
  recentJoins: CommunityMember[]
  featuredUserIds: string[]
}
