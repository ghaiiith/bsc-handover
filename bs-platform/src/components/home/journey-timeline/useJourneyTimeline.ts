'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getJourneyStageIndex,
  JOURNEY_STAGE_ORDER,
  JOURNEY_STAGES,
  type JourneyStageId,
} from '@/components/home/journey-timeline/journey-stages'

interface UseJourneyTimelineOptions {
  autoPlay: boolean
  loop: boolean
  initialStage?: JourneyStageId
  isInView: boolean
  reducedMotion: boolean
  manualHold: boolean
  onStageChange?: (id: JourneyStageId) => void
}

export function useJourneyTimeline({
  autoPlay,
  loop,
  initialStage = 'learn',
  isInView,
  reducedMotion,
  manualHold,
  onStageChange,
}: UseJourneyTimelineOptions) {
  const [stageId, setStageId] = useState<JourneyStageId>(initialStage)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onStageChangeRef = useRef(onStageChange)

  useEffect(() => {
    onStageChangeRef.current = onStageChange
  }, [onStageChange])

  useEffect(() => {
    onStageChangeRef.current?.(stageId)
  }, [stageId])

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }, [])

  const goToStage = useCallback(
    (id: JourneyStageId, fromManual = false) => {
      clearTimers()
      setStageId(id)
      if (fromManual) {
        resumeTimerRef.current = setTimeout(() => {
          resumeTimerRef.current = null
        }, 5000)
      }
    },
    [clearTimers]
  )

  const goNext = useCallback(() => {
    setStageId((current) => {
      const idx = getJourneyStageIndex(current)
      if (idx < JOURNEY_STAGE_ORDER.length - 1) {
        return JOURNEY_STAGE_ORDER[idx + 1]
      }
      return loop ? JOURNEY_STAGE_ORDER[0] : current
    })
  }, [loop])

  useEffect(() => {
    clearTimers()
    if (reducedMotion || !autoPlay || !isInView || manualHold) {
      return
    }

    const duration =
      JOURNEY_STAGES.find((s) => s.id === stageId)?.durationMs ?? 3800

    timerRef.current = setTimeout(goNext, duration)
    return clearTimers
  }, [
    autoPlay,
    clearTimers,
    goNext,
    isInView,
    manualHold,
    reducedMotion,
    stageId,
  ])

  return {
    stageId,
    goToStage,
  }
}
