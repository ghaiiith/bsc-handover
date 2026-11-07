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
import { PanelLeft, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DEFAULT_LEARN_LAYOUT_PREFERENCES,
  LESSON_PANEL_RAIL_CLASS,
  LEARN_WORKSPACE_CLASS,
  loadLearnLayoutPreferences,
  saveLearnLayoutPreferences,
} from '@/lib/playback/learn-layout-preferences'

interface LearnWorkspaceContextValue {
  curriculumOpen: boolean
  toolsOpen: boolean
  setCurriculumOpen: (open: boolean) => void
  setToolsOpen: (open: boolean) => void
  toggleCurriculum: () => void
  toggleTools: () => void
}

const LearnWorkspaceContext = createContext<LearnWorkspaceContextValue | null>(null)

export function useLearnWorkspace(): LearnWorkspaceContextValue {
  const ctx = useContext(LearnWorkspaceContext)
  if (!ctx) {
    throw new Error('useLearnWorkspace must be used within LearnWorkspaceLayout')
  }
  return ctx
}

interface LearnWorkspaceLayoutProps {
  curriculum: ReactNode
  children: ReactNode
}

export default function LearnWorkspaceLayout({
  curriculum,
  children,
}: LearnWorkspaceLayoutProps) {
  const t = useTranslations('courses.learn')
  const [prefs, setPrefs] = useState(DEFAULT_LEARN_LAYOUT_PREFERENCES)

  useEffect(() => {
    setPrefs(loadLearnLayoutPreferences())
  }, [])

  const setCurriculumOpen = useCallback((open: boolean) => {
    setPrefs(saveLearnLayoutPreferences({ curriculumOpen: open }))
  }, [])

  const setToolsOpen = useCallback((open: boolean) => {
    setPrefs(saveLearnLayoutPreferences({ toolsOpen: open }))
  }, [])

  const toggleCurriculum = useCallback(() => {
    setPrefs((current) =>
      saveLearnLayoutPreferences({ curriculumOpen: !current.curriculumOpen })
    )
  }, [])

  const toggleTools = useCallback(() => {
    setPrefs((current) => saveLearnLayoutPreferences({ toolsOpen: !current.toolsOpen }))
  }, [])

  const value = useMemo(
    () => ({
      curriculumOpen: prefs.curriculumOpen,
      toolsOpen: prefs.toolsOpen,
      setCurriculumOpen,
      setToolsOpen,
      toggleCurriculum,
      toggleTools,
    }),
    [
      prefs.curriculumOpen,
      prefs.toolsOpen,
      setCurriculumOpen,
      setToolsOpen,
      toggleCurriculum,
      toggleTools,
    ]
  )

  return (
    <LearnWorkspaceContext.Provider value={value}>
      <div className={cn('gap-4 lg:gap-5', LEARN_WORKSPACE_CLASS)}>
        {prefs.curriculumOpen ? (
          <aside className="hidden w-72 shrink-0 min-h-0 lg:flex lg:flex-col">
            {curriculum}
          </aside>
        ) : (
          <div className="hidden shrink-0 lg:flex lg:flex-col">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCurriculumOpen(true)}
              className={LESSON_PANEL_RAIL_CLASS}
              aria-label={t('expand_curriculum')}
              title={t('expand_curriculum')}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </LearnWorkspaceContext.Provider>
  )
}

export function CurriculumPanelToggle() {
  const t = useTranslations('courses.learn')
  const { curriculumOpen, toggleCurriculum } = useLearnWorkspace()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleCurriculum}
      className="hidden shrink-0 text-muted-foreground hover:text-foreground lg:inline-flex"
      aria-label={curriculumOpen ? t('collapse_curriculum') : t('expand_curriculum')}
      title={curriculumOpen ? t('collapse_curriculum') : t('expand_curriculum')}
    >
      {curriculumOpen ? (
        <PanelLeftClose className="h-4 w-4" />
      ) : (
        <PanelLeft className="h-4 w-4" />
      )}
    </Button>
  )
}
