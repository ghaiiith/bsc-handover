import { describe, it, expect } from 'vitest'
import { resolveJobSaveTransition } from '@/lib/jobs/job-save-transition'

describe('BS-103 — draft moves never enter the approval queue', () => {
  it('live → draft unpublishes immediately, no approval', () => {
    expect(resolveJobSaveTransition({ existingStatus: 'active', everPublished: true, requestedStatus: 'draft' })).toBe('unpublish')
  })

  it('editing a live job still holds the change for approval (BS-53)', () => {
    expect(resolveJobSaveTransition({ existingStatus: 'active', everPublished: true, requestedStatus: 'active' })).toBe('pending_edit')
  })

  it('republishing a previously-live draft requires approval', () => {
    expect(resolveJobSaveTransition({ existingStatus: 'draft', everPublished: true, requestedStatus: 'active' })).toBe('pending_republish')
  })

  it('a never-published draft edits freely', () => {
    expect(resolveJobSaveTransition({ existingStatus: 'draft', everPublished: false, requestedStatus: 'draft' })).toBe('direct')
  })

  it('a never-published draft publishes directly (first publication)', () => {
    expect(resolveJobSaveTransition({ existingStatus: 'draft', everPublished: false, requestedStatus: 'active' })).toBe('direct')
  })

  it('saving a previously-live draft AS a draft stays private and free', () => {
    expect(resolveJobSaveTransition({ existingStatus: 'draft', everPublished: true, requestedStatus: 'draft' })).toBe('direct')
  })

  it('an expired job republishing goes through approval like any previously-live job', () => {
    expect(resolveJobSaveTransition({ existingStatus: 'expired', everPublished: true, requestedStatus: 'active' })).toBe('pending_republish')
  })
})
