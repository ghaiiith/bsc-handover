/**
 * Round 9 (BS-103): which path does a company's save take?
 *
 * Kept as a pure function so the rule is testable without a database:
 *
 *   - Draft while live         → UNPUBLISH now, no approval, pending edits dropped.
 *   - Edit while live          → PENDING_EDIT (the approved text keeps serving).
 *   - Publish a job that was   → PENDING_REPUBLISH (stays a private draft until
 *     live before                 an admin approves the request).
 *   - Anything else            → DIRECT (a never-published draft edits/publishes freely).
 */
export type SaveTransition = 'unpublish' | 'pending_edit' | 'pending_republish' | 'direct'

export function resolveJobSaveTransition(input: {
  existingStatus: string
  everPublished: boolean
  requestedStatus: 'active' | 'draft'
}): SaveTransition {
  const { existingStatus, everPublished, requestedStatus } = input
  if (existingStatus === 'active' && requestedStatus === 'draft') return 'unpublish'
  if (existingStatus === 'active') return 'pending_edit'
  if (requestedStatus === 'active' && everPublished) return 'pending_republish'
  return 'direct'
}
