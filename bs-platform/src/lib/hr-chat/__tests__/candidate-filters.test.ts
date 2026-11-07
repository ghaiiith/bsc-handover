import { describe, it, expect } from 'vitest'
import {
  applyFilters,
  computeYearsOfExperience,
  parseFilters,
  isFilterQuestion,
  type HrCandidate,
} from '@/lib/hr-chat/candidate-filters'

const now = new Date('2026-09-20T00:00:00Z')
const exp = (start: string, end: string | null, title = 'Dev') => ({
  id: 'x', company: 'C', title, start_date: start, end_date: end, is_current: end === null, location: '', description: '',
})

const cand = (over: Partial<HrCandidate> & { id: string }): HrCandidate => ({
  name: over.id,
  skills: [],
  experience: [],
  source: 'applicant',
  ...over,
})

describe('computeYearsOfExperience', () => {
  it('sums non-overlapping roles', () => {
    const y = computeYearsOfExperience([exp('2018-01-01', '2020-01-01'), exp('2021-01-01', '2024-01-01')], now)
    expect(y).toBeCloseTo(5, 0)
  })

  it('merges overlapping roles instead of double counting', () => {
    const y = computeYearsOfExperience([exp('2020-01-01', '2024-01-01'), exp('2022-01-01', '2024-01-01')], now)
    expect(y).toBeCloseTo(4, 0)
  })

  it('counts a current role up to today', () => {
    const y = computeYearsOfExperience([exp('2024-09-20', null)], now)
    expect(y).toBeCloseTo(2, 0)
  })

  it('ignores malformed dates', () => {
    expect(computeYearsOfExperience([exp('nope', '2020-01-01')], now)).toBe(0)
  })
})

describe('parseFilters — Arabic and English HR questions', () => {
  const skills = ['Python', 'Excel', 'SQL']

  it('extracts a skill and a minimum-years floor (English)', () => {
    const f = parseFilters('Which candidates know Python with more than five years experience?', skills)
    expect(f.skills).toEqual(['Python'])
    expect(f.minYears).toBe(5)
  })

  it('extracts a skill and a floor in Arabic with Arabic digits', () => {
    const f = parseFilters('منو عنده بايثون وخبرة أكثر من ٥ سنوات؟', skills)
    expect(f.minYears).toBe(5)
  })

  it('reads "less than" as a ceiling', () => {
    const f = parseFilters('candidates with less than 3 years', skills)
    expect(f.maxYears).toBe(3)
    expect(f.minYears).toBeNull()
  })

  it('matches skills via aliases', () => {
    const f = parseFilters('who knows py and mysql', skills)
    expect(f.skills).toEqual(expect.arrayContaining(['Python', 'SQL']))
  })

  it('finds a known city', () => {
    expect(parseFilters('المتقدمين من بغداد', skills).location).toBe('بغداد')
    expect(parseFilters('applicants in Erbil', skills).location).toBe('erbil')
  })

  it('yields no filter for a general question', () => {
    const f = parseFilters('How should I structure the interview?', skills)
    expect(isFilterQuestion(f)).toBe(false)
  })
})

describe('applyFilters — evidence-backed shortlist', () => {
  const pool: HrCandidate[] = [
    cand({ id: 'ali', skills: ['Python', 'SQL'], experience: [exp('2018-01-01', null, 'Backend Dev')] }),
    cand({ id: 'sara', skills: ['Python'], experience: [exp('2024-01-01', null)] }),
    cand({ id: 'omar', skills: ['Excel'], experience: [exp('2015-01-01', null)] }),
  ]

  it('requires every skill AND the years floor', () => {
    const hits = applyFilters(pool, { skills: ['Python'], minYears: 5, maxYears: null, location: null, education: null }, 'en', now)
    expect(hits.map((h) => h.candidate.id)).toEqual(['ali'])
  })

  it('carries evidence a recruiter can check', () => {
    const [hit] = applyFilters(pool, { skills: ['Python'], minYears: 5, maxYears: null, location: null, education: null }, 'en', now)
    expect(hit.evidence.join(' ')).toContain('Python')
    expect(hit.evidence.join(' ')).toContain('Backend Dev')
    expect(hit.years).toBeGreaterThanOrEqual(8)
  })

  it('returns an empty list rather than a near miss', () => {
    const hits = applyFilters(pool, { skills: ['Python', 'Excel'], minYears: null, maxYears: null, location: null, education: null }, 'en', now)
    expect(hits).toEqual([])
  })

  it('prefers an explicit years figure over derived history', () => {
    const c = cand({ id: 'z', skills: ['Python'], experience: [], yearsOfExperience: 7 })
    const hits = applyFilters([c], { skills: [], minYears: 6, maxYears: null, location: null, education: null }, 'en', now)
    expect(hits).toHaveLength(1)
  })

  it('orders by match score, then years', () => {
    const a = cand({ id: 'a', skills: ['Python'], experience: [exp('2010-01-01', null)], matchScore: 60 })
    const b = cand({ id: 'b', skills: ['Python'], experience: [exp('2020-01-01', null)], matchScore: 90 })
    const hits = applyFilters([a, b], { skills: ['Python'], minYears: null, maxYears: null, location: null, education: null }, 'en', now)
    expect(hits.map((h) => h.candidate.id)).toEqual(['b', 'a'])
  })
})
