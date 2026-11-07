'use client'

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'
import {
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeSetting,
} from '@/lib/theme/theme-script'

interface ThemeContextValue {
  theme: ThemeSetting
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeSetting) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const THEME_EVENT = 'eduwork-theme-change'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredTheme(defaultTheme: ThemeSetting): ThemeSetting {
  if (typeof window === 'undefined') return defaultTheme
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    /* ignore */
  }
  return defaultTheme
}

function resolveTheme(theme: ThemeSetting): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyTheme(theme: ThemeSetting) {
  const resolved = resolveTheme(theme)
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

// Apply stored theme as early as possible — avoids inline <script> in React tree.
if (typeof window !== 'undefined') {
  applyTheme(readStoredTheme('system'))
}

function subscribe(onStoreChange: () => void) {
  const onThemeChange = () => onStoreChange()
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange()
  }
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onMedia = () => onStoreChange()

  window.addEventListener(THEME_EVENT, onThemeChange)
  window.addEventListener('storage', onStorage)
  media.addEventListener('change', onMedia)

  return () => {
    window.removeEventListener(THEME_EVENT, onThemeChange)
    window.removeEventListener('storage', onStorage)
    media.removeEventListener('change', onMedia)
  }
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeSetting
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const theme = useSyncExternalStore(
    subscribe,
    () => readStoredTheme(defaultTheme),
    () => defaultTheme
  )

  const resolvedTheme = resolveTheme(theme)

  useLayoutEffect(() => {
    let cleanup: (() => void) | undefined

    if (disableTransitionOnChange) {
      const style = document.createElement('style')
      style.appendChild(
        document.createTextNode(
          '*,*::before,*::after{transition:none!important}'
        )
      )
      document.head.appendChild(style)
      cleanup = () => {
        document.head.removeChild(style)
      }
    }

    applyTheme(theme)

    return cleanup
  }, [theme, disableTransitionOnChange])

  const setTheme = useCallback(
    (next: ThemeSetting) => {
      const value = next === 'system' && !enableSystem ? defaultTheme : next
      try {
        localStorage.setItem(THEME_STORAGE_KEY, value)
      } catch {
        /* ignore */
      }
      applyTheme(value)
      window.dispatchEvent(new Event(THEME_EVENT))
    },
    [defaultTheme, enableSystem]
  )

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    return {
      theme: 'system' as ThemeSetting,
      resolvedTheme: 'light' as ResolvedTheme,
      setTheme: () => {},
    }
  }
  return context
}
