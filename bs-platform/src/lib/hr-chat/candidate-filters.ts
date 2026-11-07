import type { ExperienceItem } from '@/types/profile'

/**
 * Round 9 (BS-108): the deterministic half of the job-scoped HR chatbot.
 *
 * The chatbot must "support filters such as skill and years of experience"
 * and "explain the evidence behind results". Trusting a language model to do
 * that arithmetic over applicant records is how a recruiter ends up told that
 * a two-year candidate has "more than five years". So the numbers are computed
 * here, in plain code, and the model is only asked to *explain* a shortlist it
 * cannot alter. Every returned candidate carries the evidence that qualified
 * them.
 */

export interface HrCandidate {
  id: string
  name: string
  headline?: string | null
  skills: string[]
  experience: ExperienceItem[]
  /** Explicit years, when the profile states them; otherwise derived. */
  yearsOfExperience?: number | null
  education?: Array<{ degree?: string; field?: string; institution?: string }>
  location?: string | null
  expectedSalary?: { amount: number; currency: string; period: string } | null
  applicationStatus?: string | null
  matchScore?: number | null
  source: 'applicant' | 'suggested'
}

export interface HrFilters {
  skills: string[]
  minYears: number | null
  maxYears: number | null
  location: string | null
  /** e.g. "bachelor", "master" */
  education: string | null
}

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000

/**
 * Total years across experience entries, overlapping periods merged, so two
 * simultaneous part-time roles are not double-counted.
 */
export function computeYearsOfExperience(items: ExperienceItem[], now = new Date()): number {
  const spans = items
    .map((e) => {
      const start = Date.parse(e.start_date ?? '')
      const end = e.is_current || !e.end_date ? now.getTime() : Date.parse(e.end_date)
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
      return [start, end] as [number, number]
    })
    .filter((s): s is [number, number] => s !== null)
    .sort((a, b) => a[0] - b[0])

  let total = 0
  let cursorStart = -1
  let cursorEnd = -1
  for (const [s, e] of spans) {
    if (s > cursorEnd) {
      if (cursorEnd > cursorStart) total += cursorEnd - cursorStart
      cursorStart = s
      cursorEnd = e
    } else if (e > cursorEnd) {
      cursorEnd = e
    }
  }
  if (cursorEnd > cursorStart) total += cursorEnd - cursorStart

  return Math.round((total / MONTH_MS / 12) * 10) / 10
}

export function effectiveYears(c: HrCandidate, now = new Date()): number {
  if (typeof c.yearsOfExperience === 'number' && c.yearsOfExperience >= 0) {
    return c.yearsOfExperience
  }
  return computeYearsOfExperience(c.experience ?? [], now)
}

const norm = (s: string) => s.trim().toLowerCase()

/** Skill match is case-insensitive and tolerant of "js" vs "javascript" style aliases. */
const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ['js', 'ecmascript'],
  typescript: ['ts'],
  python: ['py'],
  'node.js': ['node', 'nodejs'],
  'react': ['reactjs', 'react.js'],
  'c#': ['csharp', 'c sharp'],
  'c++': ['cpp'],
  sql: ['mysql', 'postgres', 'postgresql', 'mssql'],
  excel: ['ms excel', 'microsoft excel'],
  'إكسل': ['excel'],
}

function skillMatches(candidateSkill: string, wanted: string): boolean {
  const a = norm(candidateSkill)
  const b = norm(wanted)
  if (a === b || a.includes(b) || b.includes(a)) return true
  const aliases = SKILL_ALIASES[b] ?? []
  return aliases.some((al) => a === al || a.includes(al))
}

export interface FilterHit {
  candidate: HrCandidate
  years: number
  matchedSkills: string[]
  missingSkills: string[]
  /** Human-readable evidence lines, ready for the answer. */
  evidence: string[]
}

/**
 * Apply the filters. A candidate qualifies only when EVERY requested skill is
 * present and every numeric bound holds — an HR question like "Python AND
 * more than five years" is a conjunction.
 */
export function applyFilters(
  candidates: HrCandidate[],
  filters: HrFilters,
  locale: 'ar' | 'en' = 'ar',
  now = new Date()
): FilterHit[] {
  const isAr = locale === 'ar'
  const hits: FilterHit[] = []

  for (const c of candidates) {
    const years = effectiveYears(c, now)
    const matched = filters.skills.filter((w) => (c.skills ?? []).some((s) => skillMatches(s, w)))
    const missing = filters.skills.filter((w) => !matched.includes(w))

    if (missing.length > 0) continue
    if (filters.minYears !== null && years < filters.minYears) continue
    if (filters.maxYears !== null && years > filters.maxYears) continue
    if (filters.location && !norm(c.location ?? '').includes(norm(filters.location))) continue
    if (
      filters.education &&
      !(c.education ?? []).some((e) =>
        norm(`${e.degree ?? ''} ${e.field ?? ''}`).includes(norm(filters.education as string))
      )
    ) {
      continue
    }

    const evidence: string[] = []
    if (matched.length) {
      evidence.push(
        isAr ? `المهارات المطابقة: ${matched.join('، ')}` : `Matched skills: ${matched.join(', ')}`
      )
    }
    if (filters.minYears !== null || filters.maxYears !== null) {
      const roles = (c.experience ?? [])
        .slice(0, 3)
        .map((e) => e.title)
        .filter(Boolean)
        .join(isAr ? '، ' : ', ')
      evidence.push(
        isAr
          ? `الخبرة: ${years} سنة${roles ? ` (${roles})` : ''}`
          : `Experience: ${years} years${roles ? ` (${roles})` : ''}`
      )
    }
    if (filters.location) {
      evidence.push(isAr ? `الموقع: ${c.location}` : `Location: ${c.location}`)
    }
    if (typeof c.matchScore === 'number') {
      evidence.push(isAr ? `درجة المطابقة: ${c.matchScore}%` : `Match score: ${c.matchScore}%`)
    }

    hits.push({ candidate: c, years, matchedSkills: matched, missingSkills: missing, evidence })
  }

  return hits.sort((a, b) => {
    const s = (b.candidate.matchScore ?? 0) - (a.candidate.matchScore ?? 0)
    return s !== 0 ? s : b.years - a.years
  })
}

const AR_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}
const AR_WORDS: Record<string, number> = {
  'سنة': 1, 'سنتين': 2, 'ثلاث': 3, 'ثلاثة': 3, 'اربع': 4, 'أربع': 4, 'أربعة': 4, 'خمس': 5, 'خمسة': 5,
  'ست': 6, 'ستة': 6, 'سبع': 7, 'سبعة': 7, 'ثمان': 8, 'ثمانية': 8, 'تسع': 9, 'تسعة': 9, 'عشر': 10, 'عشرة': 10,
}
const EN_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}

function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => AR_DIGITS[d] ?? d)
}

/**
 * Pull structured filters out of a natural-language HR question, Arabic or
 * English. Deliberately conservative: an unrecognised phrase yields no filter
 * rather than a wrong one, and the model is then asked to answer generally.
 *
 * Known skills from the job posting are matched against the question so
 * "who knows Python" resolves to the exact skill string the applicants use.
 */
export function parseFilters(question: string, knownSkills: string[]): HrFilters {
  const q = normalizeDigits(question.toLowerCase())
  const filters: HrFilters = { skills: [], minYears: null, maxYears: null, location: null, education: null }

  // Skills: any known skill (or alias) mentioned in the question.
  for (const skill of knownSkills) {
    const s = norm(skill)
    const aliases = [s, ...(SKILL_ALIASES[s] ?? [])]
    if (aliases.some((a) => a.length >= 2 && q.includes(a))) filters.skills.push(skill)
  }

  // Years: numeric first, then number words.
  const numWord = (w: string) => AR_WORDS[w] ?? EN_WORDS[w] ?? Number.parseInt(w, 10)
  const yearsRe =
    /(?:(more than|over|at least|أكثر من|اكثر من|فوق|على الأقل|لا يقل عن)\s+)?(\d+|[a-z]+|[؀-ۿ]+)\s*\+?\s*(?:years?|yrs?|سنوات|سنة|سنين)/g
  let m: RegExpExecArray | null
  while ((m = yearsRe.exec(q))) {
    const n = numWord(m[2])
    if (!Number.isFinite(n) || n <= 0 || n > 60) continue
    const qualifier = m[1] ?? ''
    const before = q.slice(Math.max(0, m.index - 20), m.index)
    const lessThan = /(less than|under|below|أقل من|اقل من|تحت)\s*$/.test(before)
    if (lessThan) filters.maxYears = n
    else if (qualifier || /\+/.test(m[0]) || /\b(min|minimum)\b/.test(before)) filters.minYears = n
    else filters.minYears = n // "5 years experience" reads as a floor in HR usage
  }

  // Education.
  if (/(bachelor|بكالوريوس)/.test(q)) filters.education = 'bachelor'
  else if (/(master|ماجستير)/.test(q)) filters.education = 'master'
  else if (/(phd|doctorate|دكتوراه)/.test(q)) filters.education = 'phd'

  // Location: "in Baghdad" / "في بغداد" / "من أربيل".
  const loc = /(?:\bin\b|\bfrom\b|في|من)\s+([؀-ۿa-z][؀-ۿa-z\s-]{2,30}?)(?=[\s,.?؟]|$)/.exec(q)
  const KNOWN_CITIES = ['baghdad', 'basra', 'erbil', 'mosul', 'najaf', 'karbala', 'kirkuk', 'sulaymaniyah', 'duhok',
    'بغداد', 'البصرة', 'بصرة', 'أربيل', 'اربيل', 'الموصل', 'موصل', 'النجف', 'نجف', 'كربلاء', 'كركوك', 'السليمانية', 'سليمانية', 'دهوك']
  if (loc) {
    const candidate = loc[1].trim()
    const city = KNOWN_CITIES.find((c) => candidate.startsWith(c) || c.startsWith(candidate.split(/\s/)[0]))
    if (city) filters.location = city
  }

  return filters
}

/** True when the question actually asks for a shortlist, not general advice. */
export function isFilterQuestion(f: HrFilters): boolean {
  return f.skills.length > 0 || f.minYears !== null || f.maxYears !== null || Boolean(f.location) || Boolean(f.education)
}
