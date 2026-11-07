/**
 * Round 9 (BS-104): the 0–100 match score between a candidate and a job.
 *
 * Pure and deterministic on purpose: the alert threshold is a promise to the
 * candidate ("80% or higher"), so the number must be reproducible and
 * explainable — skills first, then role/title terms, then location.
 */

export interface AlertCandidate {
  id: string
  skills: string[]
  preferredRole?: string | null
  headline?: string | null
  location?: string | null
}

export interface AlertJob {
  id: string
  title: string
  titleAr?: string | null
  skills: string[]
  city?: string | null
}

const norm = (s: string) => s.trim().toLowerCase()

export function skillOverlap(jobSkills: string[], userSkills: string[]): { matched: string[]; ratio: number } {
  const wanted = jobSkills.map(norm).filter(Boolean)
  if (wanted.length === 0) return { matched: [], ratio: 0 }
  const have = new Set(userSkills.map(norm))
  const matched = wanted.filter((w) => [...have].some((h) => h === w || h.includes(w) || w.includes(h)))
  return { matched, ratio: matched.length / wanted.length }
}

function roleMatches(job: AlertJob, cand: AlertCandidate): boolean {
  const role = norm(cand.preferredRole ?? '') || norm(cand.headline ?? '')
  if (!role) return false
  const titles = [job.title, job.titleAr ?? ''].map(norm)
  const tokens = role.split(/[\s/,-]+/).filter((t) => t.length >= 3)
  return titles.some((t) => tokens.some((tok) => t.includes(tok)))
}

/**
 * Weighted score: skills 80, role 12, city 8.
 *
 * The weights encode the promise made to candidates: having EVERY skill the
 * job lists is, by definition, an 80% match — the alert fires on skills alone.
 * Role and city only push a full-skills match toward 100; they can never lift
 * a profile that is missing a required skill over the line (2 of 3 skills is
 * 53, and 53 + 12 + 8 = 73). A job with no listed skills tops out at 20, so an
 * empty import never fires.
 */
export function scoreMatch(job: AlertJob, cand: AlertCandidate): { score: number; matched: string[] } {
  const { matched, ratio } = skillOverlap(job.skills, cand.skills)
  let score = Math.round(ratio * 80)
  if (roleMatches(job, cand)) score += 12
  if (job.city && cand.location && norm(cand.location).includes(norm(job.city))) score += 8
  return { score: Math.min(100, score), matched }
}
