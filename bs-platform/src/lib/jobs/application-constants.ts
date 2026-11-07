// Plain constants (no 'use server') so both server actions and client components
// can import them — a 'use server' module may only export async functions.

export const APPLICATION_STATUSES = [
  'submitted',
  'reviewed',
  'shortlisted',
  'contacted',
  'accepted',
  'rejected',
  'archived',
] as const
export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number]

export const CONTACT_OUTCOMES = [
  'available_interested',
  'available_not_interested',
  'employed_elsewhere',
  'salary_too_high',
  'no_answer',
  'wrong_number',
  'contact_later',
] as const
export type ContactOutcomeValue = (typeof CONTACT_OUTCOMES)[number]
