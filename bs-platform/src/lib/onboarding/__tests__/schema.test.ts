import { describe, expect, it } from 'vitest'
import { completeOnboardingSchema } from '@/lib/onboarding/schema'

describe('completeOnboardingSchema', () => {
  const baseDiscovery = {
    discovery_source: 'google' as const,
  }

  it('accepts valid student payload', () => {
    const result = completeOnboardingSchema.safeParse({
      account_type: 'student',
      ...baseDiscovery,
      student: {
        primary_goal: 'get_job',
        skill_level: 'beginner',
        interests: ['programming'],
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects student without interests', () => {
    const result = completeOnboardingSchema.safeParse({
      account_type: 'student',
      ...baseDiscovery,
      student: {
        primary_goal: 'get_job',
        skill_level: 'beginner',
        interests: [],
      },
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid instructor payload', () => {
    const result = completeOnboardingSchema.safeParse({
      account_type: 'instructor',
      ...baseDiscovery,
      instructor: {
        instructor_intent: 'publish_courses',
        interests: ['programming'],
        instructor_experience: 'experienced',
        instructor_upload_plan: 'soon',
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects company without company_name', () => {
    const result = completeOnboardingSchema.safeParse({
      account_type: 'company',
      ...baseDiscovery,
      company: {
        company_intent: 'post_jobs',
        company_name: '',
        company_industry: 'Tech',
        company_size: '1-10',
      },
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid freelancer payload', () => {
    const result = completeOnboardingSchema.safeParse({
      account_type: 'freelancer',
      ...baseDiscovery,
      freelancer: {
        freelancer_intent: 'offer_services',
        service_categories: ['design'],
        skill_level: 'intermediate',
        availability: 'part_time',
        professional_headline: 'Graphic Designer',
      },
    })
    expect(result.success).toBe(true)
  })

  it('requires discovery_source other text', () => {
    const result = completeOnboardingSchema.safeParse({
      account_type: 'student',
      discovery_source: 'other',
      student: {
        primary_goal: 'get_job',
        skill_level: 'beginner',
        interests: ['ai'],
      },
    })
    expect(result.success).toBe(false)
  })
})
