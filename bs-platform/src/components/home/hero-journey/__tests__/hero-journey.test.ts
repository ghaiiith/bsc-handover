import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  HERO_SCENES,
  HERO_SCENE_ORDER,
  pickLocalized,
  getSceneById,
  getSceneIndex,
} from '@/components/home/hero-journey/hero-scenes'

describe('hero-scenes', () => {
  it('defines six scenes in order', () => {
    expect(HERO_SCENE_ORDER).toHaveLength(6)
    expect(HERO_SCENES.map((s) => s.id)).toEqual(HERO_SCENE_ORDER)
  })

  it('supports Arabic labels', () => {
    const learning = getSceneById('learning')
    expect(pickLocalized(learning.timelineLabel, 'ar')).toBe('تعلم')
    expect(pickLocalized(learning.caption, 'ar')).toBe('يتعلم مهارات جديدة')
  })

  it('supports English labels', () => {
    const success = getSceneById('success')
    expect(pickLocalized(success.timelineLabel, 'en')).toBe('Advance')
    expect(pickLocalized(success.caption, 'en')).toBe('Advancing your future')
  })

  it('resolves scene index', () => {
    expect(getSceneIndex('freelance')).toBe(4)
    expect(getSceneIndex('learning')).toBe(0)
  })
})

describe('useHeroSceneCycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exports scene order for cycling', () => {
    expect(HERO_SCENE_ORDER[HERO_SCENE_ORDER.length - 1]).toBe('success')
    expect(HERO_SCENES.every((s) => s.durationMs >= 3500)).toBe(true)
  })
})
