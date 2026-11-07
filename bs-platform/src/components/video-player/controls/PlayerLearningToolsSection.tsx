'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Bookmark, BookmarkPlus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatPlaybackTimeTabular } from '@/lib/playback/preferences'
import { getVisibleLearningTools } from '@/lib/playback/learning-tools'
import {
  ControlGroup,
  PLAYER_ICON,
  PlayerControlTooltip,
} from '@/components/video-player/controls/player-control-primitives'
import {
  playerDropdownContent,
  playerDropdownItem,
} from '@/components/video-player/player-ui-styles'
import type { PlayerBookmark } from '@/types/video-player'

interface PlayerLearningToolsSectionProps {
  showBookmarks: boolean
  bookmarks: PlayerBookmark[]
  onAddBookmark?: () => void
  onSeekToBookmark?: (timestampSeconds: number) => void
  className?: string
}

function PlayerLearningToolsSectionComponent({
  showBookmarks,
  bookmarks,
  onAddBookmark,
  onSeekToBookmark,
  className,
}: PlayerLearningToolsSectionProps) {
  const t = useTranslations('video_player')
  const tools = getVisibleLearningTools({ bookmark: showBookmarks })

  if (tools.length === 0 || !onAddBookmark) return null

  const sortedBookmarks = [...bookmarks].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds
  )

  return (
    <ControlGroup className={className} aria-label={t('learning_tools')}>
      <DropdownMenu>
        <PlayerControlTooltip label={t('bookmarks_menu')}>
          <DropdownMenuTrigger
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg p-1.5 text-white/90 transition-all duration-200 hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:scale-95 data-popup-open:bg-white/12 motion-reduce:transition-none motion-reduce:active:scale-100"
            aria-label={t('bookmarks_menu')}
          >
            <Bookmark className={PLAYER_ICON} />
            {bookmarks.length > 0 && (
              <span className="absolute end-0 top-0 flex h-[15px] min-w-[15px] translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold leading-none tabular-nums text-primary-foreground ring-2 ring-black/80">
                {bookmarks.length}
              </span>
            )}
          </DropdownMenuTrigger>
        </PlayerControlTooltip>
        <DropdownMenuContent align="start" className={`${playerDropdownContent} max-h-64 min-w-[12rem] overflow-y-auto player-overlay-scroll`}>
          {sortedBookmarks.length === 0 ? (
            <p className="px-3 py-2.5 text-xs leading-relaxed text-white/45">
              {t('bookmarks_empty')}
            </p>
          ) : (
            sortedBookmarks.map((bookmark) => (
              <DropdownMenuItem
                key={bookmark.id}
                className={`${playerDropdownItem} flex items-center justify-between gap-3 px-3 py-2 tabular-nums`}
                onClick={() => onSeekToBookmark?.(bookmark.timestampSeconds)}
              >
                <span className="font-medium text-white/90">
                  {formatPlaybackTimeTabular(bookmark.timestampSeconds)}
                </span>
                {bookmark.title ? (
                  <span className="truncate text-xs text-white/45">{bookmark.title}</span>
                ) : null}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            className={`${playerDropdownItem} gap-2 px-3 py-2 text-white/80`}
            onClick={onAddBookmark}
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            {t('add_bookmark_at_time')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ControlGroup>
  )
}

const PlayerLearningToolsSection = memo(PlayerLearningToolsSectionComponent)
export default PlayerLearningToolsSection
