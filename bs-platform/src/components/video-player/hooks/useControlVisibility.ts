'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

interface UseControlVisibilityOptions {
  timeoutMs?: number
  containerRef?: RefObject<HTMLElement | null>
  enabled?: boolean
}

export function useControlVisibility({
  timeoutMs = 3000,
  containerRef,
  enabled = true,
}: UseControlVisibilityOptions = {}) {
  const [visible, setVisible] = useState(true)
  const [locked, setLocked] = useState(false)
  const [cursorHidden, setCursorHidden] = useState(false)

  useEffect(() => {
    if (!enabled || locked) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const show = () => {
      setVisible(true)
      setCursorHidden(false)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        setVisible(false)
        setCursorHidden(true)
      }, timeoutMs)
    }

    const target = containerRef?.current ?? window
    show()

    if (containerRef?.current) {
      const el = containerRef.current
      el.addEventListener('mousemove', show)
      el.addEventListener('touchstart', show)
      return () => {
        if (timer) clearTimeout(timer)
        el.removeEventListener('mousemove', show)
        el.removeEventListener('touchstart', show)
      }
    }

    window.addEventListener('mousemove', show)
    window.addEventListener('touchstart', show)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('mousemove', show)
      window.removeEventListener('touchstart', show)
    }
  }, [locked, timeoutMs, containerRef, enabled])

  return {
    controlsVisible: visible || locked,
    cursorHidden: cursorHidden && !visible,
    locked,
    setLocked,
    showControls: () => {
      setVisible(true)
      setCursorHidden(false)
    },
  }
}
