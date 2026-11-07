'use client'

import { useCallback, useRef } from 'react'

export type ClickZone = 'left' | 'center' | 'right'

interface UsePlayerInteractionsOptions {
  enabled: boolean
  onSingleClick: () => void
  onDoubleClickLeft: () => void
  onDoubleClickRight: () => void
  onDoubleClickCenter: () => void
}

const DOUBLE_CLICK_MS = 300
const SINGLE_CLICK_DELAY_MS = 250

export function usePlayerInteractions({
  enabled,
  onSingleClick,
  onDoubleClickLeft,
  onDoubleClickRight,
  onDoubleClickCenter,
}: UsePlayerInteractionsOptions) {
  const lastClickRef = useRef(0)
  const singleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getZone = useCallback((clientX: number, rect: DOMRect): ClickZone => {
    const ratio = (clientX - rect.left) / rect.width
    if (ratio < 0.33) return 'left'
    if (ratio > 0.66) return 'right'
    return 'center'
  }, [])

  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled) return
      if ((event.target as HTMLElement).closest('[data-player-controls]')) return

      const now = Date.now()
      const rect = event.currentTarget.getBoundingClientRect()
      const zone = getZone(event.clientX, rect)

      if (now - lastClickRef.current < DOUBLE_CLICK_MS) {
        if (singleClickTimerRef.current) {
          clearTimeout(singleClickTimerRef.current)
          singleClickTimerRef.current = null
        }
        if (zone === 'left') onDoubleClickLeft()
        else if (zone === 'right') onDoubleClickRight()
        else onDoubleClickCenter()
        lastClickRef.current = 0
        return
      }

      lastClickRef.current = now
      if (singleClickTimerRef.current) clearTimeout(singleClickTimerRef.current)
      singleClickTimerRef.current = setTimeout(() => {
        onSingleClick()
        singleClickTimerRef.current = null
      }, SINGLE_CLICK_DELAY_MS)
    },
    [
      enabled,
      getZone,
      onSingleClick,
      onDoubleClickLeft,
      onDoubleClickRight,
      onDoubleClickCenter,
    ]
  )

  const stopPropagation = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
  }, [])

  return { handleContainerClick, stopPropagation }
}
