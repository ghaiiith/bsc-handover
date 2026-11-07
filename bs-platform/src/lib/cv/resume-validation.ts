import type { ResumeInput } from '@/types/cv'

export type ResumeRequiredField = 'name' | 'email'

export function getResumeMissingFields(resume: ResumeInput): ResumeRequiredField[] {
  const missing: ResumeRequiredField[] = []
  if (!resume.basics?.name?.trim()) missing.push('name')
  if (!resume.basics?.email?.trim()) missing.push('email')
  return missing
}

export function applyResumeFallbacks(
  resume: ResumeInput,
  fallbacks: { name?: string | null; email?: string | null }
): ResumeInput {
  const basics = { ...resume.basics }
  if (!basics.name?.trim() && fallbacks.name?.trim()) {
    basics.name = fallbacks.name.trim()
  }
  if (!basics.email?.trim() && fallbacks.email?.trim()) {
    basics.email = fallbacks.email.trim()
  }
  return { ...resume, basics }
}
