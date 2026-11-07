import type { VideoStudioSectionId } from '@/types/video-studio'

export interface VideoStudioNavItem {
  id: VideoStudioSectionId
  labelKey: string
  groupKey?: string
}

export const VIDEO_STUDIO_NAV: VideoStudioNavItem[] = [
  { id: 'general', labelKey: 'nav_general', groupKey: 'asset' },
  { id: 'source', labelKey: 'nav_source', groupKey: 'asset' },
  { id: 'upload', labelKey: 'nav_upload', groupKey: 'asset' },
  { id: 'processing', labelKey: 'nav_processing', groupKey: 'asset' },
  { id: 'timeline', labelKey: 'nav_timeline', groupKey: 'editor' },
  { id: 'chapters', labelKey: 'nav_chapters', groupKey: 'editor' },
  { id: 'bookmarks', labelKey: 'nav_bookmarks', groupKey: 'editor' },
  { id: 'resources', labelKey: 'nav_resources', groupKey: 'editor' },
  { id: 'playback', labelKey: 'nav_playback', groupKey: 'delivery' },
  { id: 'protection', labelKey: 'nav_protection', groupKey: 'delivery' },
  { id: 'analytics', labelKey: 'nav_analytics', groupKey: 'insights' },
  { id: 'versions', labelKey: 'nav_versions', groupKey: 'insights' },
  { id: 'activity', labelKey: 'nav_activity', groupKey: 'insights' },
  { id: 'advanced', labelKey: 'nav_advanced', groupKey: 'system' },
]

export const VIDEO_STUDIO_SECTION_STORAGE_KEY = 'video-studio-last-section'

export function isVideoStudioSectionId(value: string): value is VideoStudioSectionId {
  return VIDEO_STUDIO_NAV.some((item) => item.id === value)
}
