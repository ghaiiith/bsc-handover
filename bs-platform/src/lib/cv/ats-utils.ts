import type { ResumeInput } from '@/types/cv'

export function isResumeIncomplete(resume: ResumeInput): boolean {
  const hasWork = (resume.work?.length ?? 0) > 0
  const hasSkills = (resume.skills?.some((s) => s.name?.trim() || (s.keywords?.length ?? 0) > 0) ?? false)
  const hasEducation = (resume.education?.length ?? 0) > 0
  const hasSummary = Boolean(resume.basics?.summary?.trim())
  const hasName = Boolean(resume.basics?.name?.trim())
  return !hasWork && !hasSkills && !hasEducation && !hasSummary && !hasName
}

export function getScoreColor(score: number): string {
  if (score < 50) return '#EF4444'
  if (score < 75) return '#F97316'
  return '#22C55E'
}

export function detectSuggestionTab(text: string): 'summary' | 'experience' | 'skills' | 'personal' {
  const lower = text.toLowerCase()
  if (/summary|ملخص|bio|نبذة/.test(lower)) return 'summary'
  if (/experience|خبرة|work|employment|وظيف/.test(lower)) return 'experience'
  if (/skill|مهار|keyword|كلمات/.test(lower)) return 'skills'
  return 'personal'
}

export function addSkillToFormData(
  groups: { name: string; skills: string[] }[],
  skill: string
): { name: string; skills: string[] }[] {
  const trimmed = skill.trim()
  if (!trimmed) return groups
  const next = groups.length ? [...groups] : [{ name: '', skills: [] }]
  const first = next[0]
  if (first.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return groups
  next[0] = { ...first, skills: [...first.skills, trimmed] }
  return next
}

/** Filter ATS missing keywords that are not actionable skill terms. */
const ATS_KEYWORD_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'with', 'in', 'on', 'at', 'to', 'of', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can',
  'we', 'you', 'your', 'our', 'their', 'they', 'them', 'this', 'that', 'these', 'those',
  'as', 'from', 'into', 'about', 'over', 'under', 'between', 'through', 'during',
  'specializing', 'constantly', 'updating', 'looking', 'seeking', 'including',
  'within', 'across', 'using', 'used', 'work', 'working', 'role', 'position',
  'team', 'company', 'years', 'year', 'experience', 'required', 'preferred',
  'ability', 'strong', 'excellent', 'good', 'great', 'well', 'highly',
  'developer', 'developers', 'engineer', 'engineering', 'software', 'stack',
])

export function filterAtsMissingKeywords(keywords: string[]): string[] {
  return keywords.filter((kw) => {
    const word = kw.trim().toLowerCase()
    if (!word || word.length < 2) return false
    if (ATS_KEYWORD_STOPWORDS.has(word)) return false
    return true
  })
}
