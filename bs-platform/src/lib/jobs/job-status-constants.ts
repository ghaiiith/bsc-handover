// Plain constants (no 'use server') so client components and server actions can
// both import them.

export const JOB_STATUS_ANSWERS = [
  'found_platform',
  'found_elsewhere',
  'still_looking',
  'not_looking',
] as const
export type JobStatusAnswer = (typeof JOB_STATUS_ANSWERS)[number]
