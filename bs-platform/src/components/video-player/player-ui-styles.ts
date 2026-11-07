/** Shared visual tokens for the enterprise video player UI layer. */

export const PLAYER_ICON = 'h-4 w-4 shrink-0'
export const PLAYER_ICON_PRIMARY = 'h-5 w-5 shrink-0'

/** 8–10px within a control group */
export const PLAYER_GROUP_GAP = 'gap-2.5'

/** 20–28px between logical sections */
export const PLAYER_SECTION_GAP = 'gap-6 lg:gap-7'

export const playerControlBar =
  'absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-4 pb-4 pt-14 transition-opacity duration-300 motion-reduce:transition-none'

export const playerTooltipSurface =
  'pointer-events-none absolute start-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900/95 px-2.5 py-1.5 text-[11px] font-medium leading-none text-white shadow-lg ring-1 ring-white/10 opacity-0 transition-all duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 motion-reduce:transition-none'

export const playerTooltipArrow =
  'absolute start-1/2 -translate-x-1/2 border-4 border-transparent'

export const playerMenuTrigger =
  'inline-flex h-8 min-w-[2.75rem] items-center justify-center rounded-lg bg-white/[0.08] px-2.5 text-xs font-medium tabular-nums text-white/80 transition-all duration-200 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 data-popup-open:bg-white/15 data-popup-open:text-white'

export const playerDropdownContent =
  'min-w-[10rem] overflow-hidden rounded-xl border border-white/10 bg-black/92 text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none'

export const playerDropdownItem =
  'cursor-pointer rounded-md text-sm text-white/90 transition-colors focus:bg-white/10 focus:text-white data-highlighted:bg-white/10'

export const playerOverlayPanel =
  'rounded-2xl border border-white/10 bg-black/88 text-white shadow-2xl backdrop-blur-xl'

export const playerOverlayFullscreen =
  'absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/88 px-6 text-center text-white backdrop-blur-xl animate-in fade-in duration-300 motion-reduce:animate-none'

export const playerOverlayToast =
  'absolute inset-x-0 top-4 z-35 mx-auto flex w-fit max-w-md flex-col items-center rounded-2xl border border-white/10 bg-black/88 px-5 py-4 text-center text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none'

export const playerOverlayDim =
  'pointer-events-none absolute inset-0 z-25 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in motion-reduce:animate-none'

export const playerSettingsPanel =
  'absolute end-3 bottom-[5.25rem] z-40 overflow-hidden'

export const playerSettingsPanelNormal =
  'w-[13.5rem] max-w-[calc(100%-1.5rem)] p-2.5'

export const playerSettingsPanelFullscreen =
  'w-[15rem] max-w-[calc(100%-2rem)] p-3'

export const playerSettingsSelectTrigger =
  'h-7 w-full min-w-0 rounded-md border border-white/12 bg-white/[0.06] text-[11px] text-white shadow-none transition-colors hover:bg-white/[0.08] focus:ring-1 focus:ring-white/20'

export const playerSettingsCategoryTitle = 'text-xs font-semibold tracking-wide text-white/90'

export const playerSettingsCategoryDescription =
  'text-xs leading-relaxed text-white/45'

export const playerSettingsRow =
  'flex cursor-pointer items-center justify-between gap-3 rounded-md px-0 py-2 transition-colors duration-150 hover:bg-white/[0.06]'

export const playerEndScreenButtonBase =
  'h-9 rounded-lg px-4 text-xs font-medium transition-all duration-200 motion-reduce:transition-none'

export const playerEndScreenButtonBaseFullscreen =
  'h-10 min-w-[10rem] rounded-lg px-5 text-sm font-medium transition-all duration-200 motion-reduce:transition-none'
