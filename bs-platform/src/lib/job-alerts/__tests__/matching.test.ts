import { describe, it, expect } from 'vitest'
import { scoreMatch, skillOverlap } from '@/lib/job-alerts/matching'

const job = { id: 'j', title: 'Backend Developer', titleAr: 'مطوّر باك إند', skills: ['python', 'sql', 'docker'], city: 'بغداد' }

describe('skillOverlap', () => {
  it('is case-insensitive and tolerant of partial forms', () => {
    // "postgresql" contains "sql" — that is a hit, not a false positive.
    const { matched, ratio } = skillOverlap(['Python', 'SQL'], ['python 3', 'postgresql'])
    expect(matched).toEqual(['python', 'sql'])
    expect(ratio).toBe(1)
  })
  it('does not credit a skill the candidate lacks', () => {
    const { matched } = skillOverlap(['Python', 'Docker'], ['python'])
    expect(matched).toEqual(['python'])
  })
  it('is zero for a job with no listed skills', () => {
    expect(skillOverlap([], ['python']).ratio).toBe(0)
  })
})

describe('scoreMatch — the 80% promise (BS-104)', () => {
  it('reaches 100 for full skills + role + city', () => {
    const { score } = scoreMatch(job, { id: 'u', skills: ['python', 'sql', 'docker'], preferredRole: 'backend developer', location: 'بغداد' })
    expect(score).toBe(100)
  })

  it('every listed skill, on its own, IS an 80% match', () => {
    const { score } = scoreMatch(job, { id: 'u', skills: ['python', 'sql', 'docker'] })
    expect(score).toBe(80)
  })

  it('a missing required skill cannot be papered over by role + city', () => {
    const { score } = scoreMatch(job, {
      id: 'u',
      skills: ['python', 'sql'],
      headline: 'Backend engineer',
      location: 'بغداد',
    })
    expect(score).toBeLessThan(80)
  })

  it('two of three skills alone does NOT clear 80', () => {
    const { score } = scoreMatch(job, { id: 'u', skills: ['python', 'sql'] })
    expect(score).toBeLessThan(80)
  })

  it('an unrelated profile scores near zero', () => {
    const { score } = scoreMatch(job, { id: 'u', skills: ['welding'], preferredRole: 'nurse', location: 'أربيل' })
    expect(score).toBe(0)
  })

  it('a job with no skills can never fire an alert', () => {
    const { score } = scoreMatch({ ...job, skills: [] }, { id: 'u', skills: ['python'], preferredRole: 'backend developer', location: 'بغداد' })
    expect(score).toBeLessThan(80)
  })

  it('reports the matched skills as evidence', () => {
    const { matched } = scoreMatch(job, { id: 'u', skills: ['Docker', 'PYTHON'] })
    expect(matched.sort()).toEqual(['docker', 'python'])
  })
})
