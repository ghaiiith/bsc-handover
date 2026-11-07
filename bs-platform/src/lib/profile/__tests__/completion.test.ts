import { describe, it, expect } from 'vitest'
import {
  getProfileCompletion,
  getCompanyProfileCompletion,
} from '@/lib/profile/completion'

const fullCompany = {
  company_name: 'Acme',
  company_name_ar: 'أكمي',
  company_logo_url: 'https://x/logo.png',
  company_type: 'private',
  company_industry: 'tech',
  company_size: '11-50',
  company_governorate: 'بغداد',
  company_city: 'بغداد',
  company_hr_name: 'Sara',
  company_hr_role: 'HR Manager',
  company_hr_email: 'hr@acme.com',
  company_description: 'x'.repeat(120),
}

describe('BS-90 — one completion figure per role', () => {
  it('scores a fully filled company at 100', () => {
    expect(getCompanyProfileCompletion(fullCompany)).toBe(100)
  })

  it('routes a company through the company checklist, not the CV one', () => {
    const viaRouter = getProfileCompletion({ ...fullCompany, role: 'company' }, 'company')
    expect(viaRouter).toBe(getCompanyProfileCompletion(fullCompany))
  })

  it('does not punish a company for missing CV fields it never has', () => {
    // No headline / skills / experience / education anywhere in the record.
    expect(getProfileCompletion({ ...fullCompany, role: 'company' }, 'company')).toBe(100)
  })

  it('drops as required company fields go missing', () => {
    const { company_logo_url: _logo, company_hr_email: _email, ...partial } = fullCompany
    const score = getCompanyProfileCompletion(partial)
    expect(score).toBeLessThan(100)
    expect(score).toBeGreaterThan(0)
  })

  it('treats a too-short description as incomplete', () => {
    const short = { ...fullCompany, company_description: 'too short' }
    expect(getCompanyProfileCompletion(short)).toBeLessThan(100)
  })

  it('returns 0 for a missing profile instead of throwing', () => {
    expect(getProfileCompletion(null, 'company')).toBe(0)
    expect(getProfileCompletion(undefined, 'student')).toBe(0)
  })

  it('still uses the CV checklist for non-company roles', () => {
    const student = getProfileCompletion({ full_name: 'Ali' }, 'student')
    // full_name alone is worth 10 on the CV formula, not the company one.
    expect(student).toBe(10)
  })
})
