'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSceneIndex,
  HERO_SCENES,
  HERO_SCENE_ORDER,
  type HeroSceneId,
} from '@/components/home/hero-journey/hero-scenes'

interface UseHeroSceneCycleOptions {
  autoPlay: boolean
  loop: boolean
  initialScene?: HeroSceneId
  isInView: boolean
  reducedMotion: boolean
  userPaused: boolean
  skipped: boolean
}

export function useHeroSceneCycle({
  autoPlay,
  loop,
  initialScene = 'learning',
  isInView,
  reducedMotion,
  userPaused,
  skipped,
}: UseHeroSceneCycleOptions) {
  const [sceneId, setSceneId] = useState<HeroSceneId>(
    skipped ? 'success' : initialScene
  )
  const [replayKey, setReplayKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const goToScene = useCallback(
    (id: HeroSceneId) => {
      clearTimer()
      setSceneId(id)
    },
    [clearTimer]
  )

  const goNext = useCallback(() => {
    setSceneId((current) => {
      const idx = getSceneIndex(current)
      if (idx < HERO_SCENE_ORDER.length - 1) {
        return HERO_SCENE_ORDER[idx + 1]
      }
      return loop ? HERO_SCENE_ORDER[0] : current
    })
  }, [loop])

  const replay = useCallback(() => {
    clearTimer()
    setSceneId('learning')
    setReplayKey((k) => k + 1)
  }, [clearTimer])

  const skip = useCallback(() => {
    clearTimer()
    setSceneId('success')
  }, [clearTimer])

  useEffect(() => {
    clearTimer()
    if (reducedMotion || !autoPlay || userPaused || !isInView || skipped) {
      return
    }

    const duration =
      HERO_SCENES.find((s) => s.id === sceneId)?.durationMs ?? 4000

    timerRef.current = setTimeout(goNext, duration)
    return clearTimer
  }, [
    autoPlay,
    clearTimer,
    goNext,
    isInView,
    reducedMotion,
    replayKey,
    sceneId,
    skipped,
    userPaused,
  ])

  return {
    sceneId,
    goToScene,
    goNext,
    replay,
    skip,
    replayKey,
  }
}
