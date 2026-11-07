'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatPlaybackTimeTabular } from '@/lib/playback/preferences'
import { playerDropdownContent, playerDropdownItem } from '@/components/video-player/player-ui-styles'
import type { PlayerBookmark } from '@/types/video-player'

interface PlayerMoreMenuProps {
  showBookmarks: boolean
  bookmarks?: PlayerBookmark[]
  supportsPiP: boolean
  hasPrevious: boolean
  hasNext: boolean
  onToggleSettings: () => void
  onAddBookmark?: () => void
  onSeekToBookmark?: (timestampSeconds: number) => void
  onPictureInPicture: () => void
  onPreviousLesson?: () => void
  onNextLesson?: () => void
}

function PlayerMoreMenuComponent({
  showBookmarks,
  bookmarks = [],
  supportsPiP,
  hasPrevious,
  hasNext,
  onToggleSettings,
  onAddBookmark,
  onSeekToBookmark,
  onPictureInPicture,
  onPreviousLesson,
  onNextLesson,
}: PlayerMoreMenuProps) {
  const t = useTranslations('video_player')
  const sortedBookmarks = [...bookmarks].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition-all hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 active:scale-95 md:hidden"
        aria-label={t('more_options')}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`${playerDropdownContent} min-w-[11rem]`}
      >
        {hasPrevious && onPreviousLesson && (
          <DropdownMenuItem className={playerDropdownItem} onClick={onPreviousLesson}>
            {t('previous_lesson')}
          </DropdownMenuItem>
        )}
        {hasNext && onNextLesson && (
          <DropdownMenuItem className={playerDropdownItem} onClick={onNextLesson}>
            {t('next_lesson')}
          </DropdownMenuItem>
        )}
        {(hasPrevious || hasNext) && <DropdownMenuSeparator />}

        {showBookmarks && sortedBookmarks.length > 0 && (
          <>
            {sortedBookmarks.map((bookmark) => (
              <DropdownMenuItem
                key={bookmark.id}
                className={`${playerDropdownItem} tabular-nums`}
                onClick={() => onSeekToBookmark?.(bookmark.timestampSeconds)}
              >
                {formatPlaybackTimeTabular(bookmark.timestampSeconds)}
                {bookmark.title ? ` — ${bookmark.title}` : ''}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {showBookmarks && onAddBookmark && (
          <DropdownMenuItem className={playerDropdownItem} onClick={onAddBookmark}>
            {t('add_bookmark')}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem className={playerDropdownItem} onClick={onToggleSettings}>
          {t('settings')}
        </DropdownMenuItem>

        {supportsPiP && (
          <DropdownMenuItem className={playerDropdownItem} onClick={onPictureInPicture}>
            {t('picture_in_picture')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const PlayerMoreMenu = memo(PlayerMoreMenuComponent)
export default PlayerMoreMenu
