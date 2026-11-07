import { describe, expect, it } from 'vitest'
import {
  JOURNEY_STAGES,
  JOURNEY_STAGE_ORDER,
  getJourneyStage,
  stageLabel,
  stageTitle,
} from '@/components/home/journey-timeline/journey-stages'

describe('journey-stages', () => {
  it('defines six stages', () => {
    expect(JOURNEY_STAGE_ORDER).toHaveLength(6)
    expect(JOURNEY_STAGES.map((s) => s.id)).toEqual(JOURNEY_STAGE_ORDER)
  })

  it('has bilingual labels', () => {
    const certified = getJourneyStage('certified')
    expect(stageLabel(certified, 'en')).toBe('Get Certified')
    expect(stageLabel(certified, 'ar')).toBe('احصل على شهادة')
    expect(stageTitle(certified, 'en')).toBe('Earn verified certificates')
  })

  it('uses reasonable stage durations', () => {
    expect(JOURNEY_STAGES.every((s) => s.durationMs >= 3000)).toBe(true)
  })
})
