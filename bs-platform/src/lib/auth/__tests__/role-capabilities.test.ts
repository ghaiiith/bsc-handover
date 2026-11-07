import { describe, it, expect } from 'vitest'
import {
  canAccessAiFeatures,
  canUseAiChat,
  canPostJobs,
  isPrivilegedRole,
} from '@/lib/auth/role-capabilities'

describe('canUseAiChat', () => {
  it('lets students use the chat assistants', () => {
    expect(canUseAiChat('student')).toBe(true)
  })

  it('lets every other signed-in role use them', () => {
    for (const role of ['instructor', 'admin', 'company', 'freelancer']) {
      expect(canUseAiChat(role)).toBe(true)
    }
  })

  it('still refuses callers with no role at all', () => {
    expect(canUseAiChat(null)).toBe(false)
    expect(canUseAiChat(undefined)).toBe(false)
    expect(canUseAiChat('')).toBe(false)
  })
})

describe('canAccessAiFeatures', () => {
  it('stays restricted to the privileged roles', () => {
    expect(canAccessAiFeatures('student')).toBe(false)
    expect(canAccessAiFeatures('instructor')).toBe(true)
    expect(canAccessAiFeatures('admin')).toBe(true)
    expect(canAccessAiFeatures('company')).toBe(true)
    expect(canAccessAiFeatures('freelancer')).toBe(true)
  })

  it('is not the same gate as the chat assistants', () => {
    expect(canUseAiChat('student')).toBe(true)
    expect(canAccessAiFeatures('student')).toBe(false)
  })
})

describe('unrelated capabilities are untouched', () => {
  it('keeps job posting to admins and companies', () => {
    expect(canPostJobs('company')).toBe(true)
    expect(canPostJobs('admin')).toBe(true)
    expect(canPostJobs('student')).toBe(false)
    expect(canPostJobs('instructor')).toBe(false)
  })

  it('keeps isPrivilegedRole excluding students', () => {
    expect(isPrivilegedRole('student')).toBe(false)
    expect(isPrivilegedRole('admin')).toBe(true)
  })
})
