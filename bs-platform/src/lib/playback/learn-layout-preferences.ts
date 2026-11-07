export interface LearnLayoutPreferences {
  curriculumOpen: boolean
  toolsOpen: boolean
}

const STORAGE_KEY = 'eduwork-learn-layout'

const DEFAULT_PREFERENCES: LearnLayoutPreferences = {
  curriculumOpen: true,
  toolsOpen: true,
}

/** SSR-safe default — must match the server render before hydration. */
export const DEFAULT_LEARN_LAYOUT_PREFERENCES: LearnLayoutPreferences = DEFAULT_PREFERENCES

export function loadLearnLayoutPreferences(): LearnLayoutPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) as Partial<LearnLayoutPreferences> }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveLearnLayoutPreferences(
  prefs: Partial<LearnLayoutPreferences>
): LearnLayoutPreferences {
  const merged = { ...loadLearnLayoutPreferences(), ...prefs }
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  }
  return merged
}

/** Fills remaining viewport space inside the learn shell (parent must be flex + min-h-0). */
export const LEARN_WORKSPACE_CLASS = 'flex min-h-0 flex-1 overflow-hidden'

/** Max video height — width follows 16:9; mobile prioritizes full width. */
export const LESSON_VIDEO_MAX_HEIGHT = 'min(48dvh,28rem)'

export const LESSON_VIDEO_FRAME_CLASS = 'w-full shrink-0'

export const LESSON_VIDEO_BOX_CLASS =
  'mx-auto aspect-video w-full overflow-hidden rounded-xl bg-black max-lg:max-w-none max-lg:max-h-[min(56dvh,24rem)] lg:max-h-[min(48dvh,28rem)] lg:max-w-[min(100%,calc(min(48dvh,28rem)*16/9))]'

export const LESSON_PANEL_RAIL_CLASS =
  'h-auto self-center rounded-xl border-dashed px-0 py-6 w-9'
