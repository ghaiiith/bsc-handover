'use client'

import { useEffect, type RefObject } from 'react'

interface UsePlayerKeyboardOptions {
  enabled: boolean
  containerRef: RefObject<HTMLElement | null>
  isHovered: boolean
  isFullscreen: boolean
  settingsOpen: boolean
  onCloseSettings?: () => void
  onTogglePlay: () => void
  onSeekRelative: (delta: number) => void
  onVolumeChange: (delta: number) => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
  onToggleSettings?: () => void
}

export function usePlayerKeyboard({
  enabled,
  containerRef,
  isHovered,
  isFullscreen,
  settingsOpen,
  onCloseSettings,
  onTogglePlay,
  onSeekRelative,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onToggleSettings,
}: UsePlayerKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return

    const isActive = () => {
      const el = containerRef.current
      if (!el) return false
      if (isFullscreen) return true
      if (isHovered) return true
      return el.contains(document.activeElement)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isActive()) return

      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return
      }

      if (event.key === 'Escape') {
        if (settingsOpen) {
          event.preventDefault()
          onCloseSettings?.()
        }
        return
      }

      switch (event.key) {
        case ' ':
        case 'k':
        case 'K':
          event.preventDefault()
          onTogglePlay()
          break
        case 'j':
        case 'J':
          event.preventDefault()
          onSeekRelative(-10)
          break
        case 'l':
        case 'L':
          event.preventDefault()
          onSeekRelative(10)
          break
        case 'ArrowLeft':
          event.preventDefault()
          onSeekRelative(event.shiftKey ? -10 : -5)
          break
        case 'ArrowRight':
          event.preventDefault()
          onSeekRelative(event.shiftKey ? 10 : 5)
          break
        case 'ArrowUp':
          event.preventDefault()
          onVolumeChange(0.05)
          break
        case 'ArrowDown':
          event.preventDefault()
          onVolumeChange(-0.05)
          break
        case 'm':
        case 'M':
          event.preventDefault()
          onToggleMute()
          break
        case 'f':
        case 'F':
          event.preventDefault()
          onToggleFullscreen()
          break
        case 's':
        case 'S':
          event.preventDefault()
          onToggleSettings?.()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    enabled,
    containerRef,
    isHovered,
    isFullscreen,
    settingsOpen,
    onCloseSettings,
    onTogglePlay,
    onSeekRelative,
    onVolumeChange,
    onToggleMute,
    onToggleFullscreen,
    onToggleSettings,
  ])
}
