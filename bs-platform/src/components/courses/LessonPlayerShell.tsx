'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'
import { PanelRight, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { applyPlayerPreferences, DEFAULT_PLAYER_PREFERENCES, loadPlayerPreferences } from '@/lib/playback/preferences'
import { LESSON_PANEL_RAIL_CLASS } from '@/lib/playback/learn-layout-preferences'
import { useLearnWorkspace } from '@/components/courses/LearnWorkspaceLayout'
import type { PlayerPreferences } from '@/types/video-player'

interface LessonPlayerShellContextValue {
  focusMode: boolean
  cinemaMode: boolean
  setFocusMode: (enabled: boolean) => void
  setCinemaMode: (enabled: boolean) => void
}

const LessonPlayerShellContext = createContext<LessonPlayerShellContextValue | null>(null)

export function useLessonPlayerShell(): LessonPlayerShellContextValue {
  const ctx = useContext(LessonPlayerShellContext)
  if (!ctx) {
    return {
      focusMode: false,
      cinemaMode: false,
      setFocusMode: () => undefined,
      setCinemaMode: () => undefined,
    }
  }
  return ctx
}

interface LessonPlayerShellProps {
  children: ReactNode
  sidebar: ReactNode
  mainContent: ReactNode
}

export default function LessonPlayerShell({
  children,
  sidebar,
  mainContent,
}: LessonPlayerShellProps) {
  const t = useTranslations('courses.learn')
  const { toolsOpen, setToolsOpen } = useLearnWorkspace()
  const [prefs, setPrefs] = useState<PlayerPreferences>(DEFAULT_PLAYER_PREFERENCES)

  useEffect(() => {
    setPrefs(loadPlayerPreferences())
  }, [])
  const setFocusMode = useCallback((enabled: boolean) => {
    const next = applyPlayerPreferences({ focusMode: enabled })
    setPrefs(next)
  }, [])

  const setCinemaMode = useCallback((enabled: boolean) => {
    const next = applyPlayerPreferences({ cinemaMode: enabled })
    setPrefs(next)
  }, [])

  const value = useMemo(
    () => ({
      focusMode: prefs.focusMode,
      cinemaMode: prefs.cinemaMode,
      setFocusMode,
      setCinemaMode,
    }),
    [prefs.focusMode, prefs.cinemaMode, setFocusMode, setCinemaMode]
  )

  const showTools = !prefs.focusMode && toolsOpen

  return (
    <LessonPlayerShellContext.Provider value={value}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden max-lg:overflow-visible">
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden max-lg:overflow-visible lg:gap-5">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-lg:overflow-visible">
            <div className="shrink-0">{mainContent}</div>
            {!prefs.focusMode && (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pe-0.5 pt-4 max-lg:overflow-visible max-lg:pb-8">
                <div className="space-y-5 lg:space-y-4">{children}</div>
              </div>
            )}
          </div>

          {showTools && (
            <aside className="hidden min-h-0 w-[min(100%,20rem)] shrink-0 lg:flex lg:flex-col">
              {sidebar}
            </aside>
          )}

          {!prefs.focusMode && !toolsOpen && (
            <div className="hidden shrink-0 lg:flex lg:flex-col">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setToolsOpen(true)}
                className={LESSON_PANEL_RAIL_CLASS}
                aria-label={t('expand_tools')}
                title={t('expand_tools')}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {!prefs.focusMode && (
          <aside className="mt-5 shrink-0 lg:hidden">{sidebar}</aside>
        )}
      </div>
    </LessonPlayerShellContext.Provider>
  )
}

export function ToolsPanelToggle() {
  const t = useTranslations('courses.learn')
  const { toolsOpen, toggleTools } = useLearnWorkspace()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleTools}
      className="hidden shrink-0 text-muted-foreground hover:text-foreground lg:inline-flex"
      aria-label={toolsOpen ? t('collapse_tools') : t('expand_tools')}
      title={toolsOpen ? t('collapse_tools') : t('expand_tools')}
    >
      {toolsOpen ? (
        <PanelRightClose className="h-4 w-4" />
      ) : (
        <PanelRight className="h-4 w-4" />
      )}
    </Button>
  )
}
