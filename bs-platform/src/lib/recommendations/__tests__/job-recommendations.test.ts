import { describe, it, expect } from 'vitest'
import {
  countSkillOverlap,
  platformFirst,
  rankJobsByOverlap,
} from '@/lib/recommendations/get-job-recommendations'
import type { Job } from '@/types'

const job = (over: Partial<Job> & { id: string }): Job =>
  ({
    title: 'T',
    title_ar: 'ت',
    company_name: 'C',
    city: 'بغداد',
    job_type: 'full_time',
    skills: [],
    status: 'active',
    is_external: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  }) as Job

describe('countSkillOverlap', () => {
  it('counts shared skills regardless of case or padding', () => {
    expect(countSkillOverlap(['Excel', ' SQL '], ['excel', 'sql'])).toBe(2)
  })

  it('is zero when either side is empty', () => {
    expect(countSkillOverlap([], ['excel'])).toBe(0)
    expect(countSkillOverlap(['excel'], [])).toBe(0)
  })

  it('ignores skills the job does not ask for', () => {
    expect(countSkillOverlap(['Excel'], ['excel', 'python'])).toBe(1)
  })
})

describe('platformFirst', () => {
  it('moves every platform job ahead of the imports', () => {
    const out = platformFirst([
      job({ id: 'x1' }),
      job({ id: 'p1', is_external: false }),
      job({ id: 'x2' }),
      job({ id: 'p2', is_external: false }),
    ])
    expect(out.map((j) => j.id)).toEqual(['p1', 'p2', 'x1', 'x2'])
  })

  it('keeps the ranker order inside each group', () => {
    const out = platformFirst([job({ id: 'x2' }), job({ id: 'x1' })])
    expect(out.map((j) => j.id)).toEqual(['x2', 'x1'])
  })
})

describe('rankJobsByOverlap', () => {
  it('puts a platform job first even when an import matches more skills', () => {
    const out = rankJobsByOverlap(
      [
        job({ id: 'import', skills: ['excel', 'sql', 'python'] }),
        job({ id: 'platform', is_external: false, skills: [] }),
      ],
      ['excel', 'sql', 'python']
    )
    expect(out[0].id).toBe('platform')
  })

  it('ranks by skill overlap within the same source', () => {
    const out = rankJobsByOverlap(
      [
        job({ id: 'none', skills: ['welding'] }),
        job({ id: 'two', skills: ['excel', 'sql'] }),
        job({ id: 'one', skills: ['excel'] }),
      ],
      ['excel', 'sql']
    )
    expect(out.map((j) => j.id)).toEqual(['two', 'one', 'none'])
  })

  it('prefers the seeker city when overlap ties', () => {
    const out = rankJobsByOverlap(
      [
        job({ id: 'far', city: 'البصرة' }),
        job({ id: 'near', city: 'أربيل' }),
      ],
      [],
      'أربيل'
    )
    expect(out[0].id).toBe('near')
  })

  it('falls back to newest when everything else ties', () => {
    const out = rankJobsByOverlap(
      [
        job({ id: 'old', created_at: '2026-01-01T00:00:00Z' }),
        job({ id: 'new', created_at: '2026-06-01T00:00:00Z' }),
      ],
      []
    )
    expect(out[0].id).toBe('new')
  })

  it('does not mutate the array it was given', () => {
    const input = [job({ id: 'a' }), job({ id: 'b', is_external: false })]
    rankJobsByOverlap(input, [])
    expect(input.map((j) => j.id)).toEqual(['a', 'b'])
  })
})
