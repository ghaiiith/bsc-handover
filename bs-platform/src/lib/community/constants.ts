// Report BS-67: a student appears in the community once their profile completion
// reaches this percentage. Aligned with the score shown on the profile screen.
export const COMMUNITY_MIN_SCORE = 70

export const COMMUNITY_PAGE_SIZE = 24

/**
 * Single source of truth for who appears in the community (report BS-17).
 * A profile qualifies once the user has made a genuine effort: at least one skill
 * AND a headline or bio. Kept intentionally low so real, onboarded users are not
 * hidden behind the old score>=60 wall — the base query still scopes to active,
 * public, onboarded accounts.
 */
export function profileMeetsCommunityBar(input: {
  skills?: string[] | null
  headline?: string | null
  bio?: string | null
}): boolean {
  const skills = (input.skills ?? []).filter((s) => Boolean(s?.trim()))
  if (skills.length < 1) return false
  return Boolean(input.headline?.trim() || input.bio?.trim())
}

/**
 * Report BS-67/68: THE single source of truth for "will this profile appear in
 * the Community". The Community query and every screen that tells the student
 * whether they are visible must use THIS — previously the query used the score
 * while the profile screen used the old skills+headline bar, so a student could
 * be told they were visible while the listing hid them (and vice versa).
 */
export function meetsCommunityThreshold(score: number): boolean {
  return score >= COMMUNITY_MIN_SCORE
}

export const COMMUNITY_CATEGORIES = [
  {
    value: 'programming',
    emoji: '💻',
    label: 'برمجة',
    labelEn: 'Programming',
    keywords: [
      'react', 'node', 'javascript', 'typescript', 'python', 'java', 'php', 'laravel',
      'django', 'angular', 'vue', 'next', 'full stack', 'backend', 'frontend',
      'برمجة', 'مطور', 'تطوير', 'ويب', 'برنامج', 'software', 'developer', 'programming',
      'c#', '.net', 'golang', 'rust', 'api', 'sql', 'database',
    ],
  },
  {
    value: 'design',
    emoji: '🎨',
    label: 'تصميم',
    labelEn: 'Design',
    keywords: [
      'design', 'ui', 'ux', 'figma', 'photoshop', 'illustrator', 'graphic',
      'تصميم', 'جرافيك', 'واجهات', 'ui/ux', 'brand', 'logo', 'creative',
    ],
  },
  {
    value: 'data',
    emoji: '📊',
    label: 'بيانات وذكاء اصطناعي',
    labelEn: 'Data & AI',
    keywords: [
      'data', 'ai', 'machine learning', 'ml', 'analytics', 'power bi', 'tableau',
      'ذكاء اصطناعي', 'بيانات', 'تحليل', 'tensorflow', 'pandas', 'deep learning',
    ],
  },
  {
    value: 'mobile',
    emoji: '📱',
    label: 'موبايل',
    labelEn: 'Mobile',
    keywords: [
      'mobile', 'flutter', 'react native', 'android', 'ios', 'swift', 'kotlin',
      'موبايل', 'تطبيقات', 'app', 'iphone',
    ],
  },
  {
    value: 'video',
    emoji: '🎬',
    label: 'فيديو وميديا',
    labelEn: 'Video & Media',
    keywords: [
      'video', 'editing', 'premiere', 'after effects', 'motion', 'media',
      'فيديو', 'مونتاج', 'ميديا', 'animation', 'youtube',
    ],
  },
  {
    value: 'marketing',
    emoji: '📢',
    label: 'تسويق',
    labelEn: 'Marketing',
    keywords: [
      'marketing', 'seo', 'social media', 'ads', 'google ads', 'content',
      'تسويق', 'سوشيال', 'إعلانات', 'digital marketing', 'copywriting',
    ],
  },
  {
    value: 'business',
    emoji: '💰',
    label: 'أعمال',
    labelEn: 'Business',
    keywords: [
      'business', 'management', 'finance', 'accounting', 'project management',
      'أعمال', 'إدارة', 'محاسبة', 'مالية', 'hr', 'operations',
    ],
  },
] as const

export function memberMatchesCategory(skills: string[], category: string): boolean {
  if (!category || category === 'all') return true
  const cat = COMMUNITY_CATEGORIES.find((c) => c.value === category)
  if (!cat) return true

  const normalizedSkills = skills.map((s) => s.toLowerCase())
  return cat.keywords.some((kw) =>
    normalizedSkills.some((skill) => skill.includes(kw.toLowerCase()) || kw.toLowerCase().includes(skill))
  )
}

export function memberMatchesCity(location: string | null | undefined, city: string): boolean {
  if (!city || city === 'all') return true
  const loc = (location ?? '').toLowerCase()
  return loc.includes(city.toLowerCase())
}

export function memberMatchesSearch(
  member: { full_name: string; full_name_ar?: string | null; skills: string[]; headline?: string | null },
  q: string
): boolean {
  const query = q.trim().toLowerCase()
  if (!query) return true
  const haystack = [
    member.full_name,
    member.full_name_ar ?? '',
    member.headline ?? '',
    ...member.skills,
  ]
    .join(' ')
    .toLowerCase()
  return query.split(/\s+/).some((word) => haystack.includes(word))
}
