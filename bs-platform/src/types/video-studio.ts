import type { VideoProviderId } from '@/lib/video-providers/types'

/** Navigation sections inside Video Studio. */
export type VideoStudioSectionId =
  | 'general'
  | 'source'
  | 'upload'
  | 'processing'
  | 'timeline'
  | 'chapters'
  | 'bookmarks'
  | 'resources'
  | 'playback'
  | 'protection'
  | 'analytics'
  | 'versions'
  | 'activity'
  | 'advanced'

export type VideoStudioAssetStatus =
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'ready'
  | 'failed'
  | 'encrypted'

export type VideoStudioPipelineStageStatus =
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed'
  | 'skipped'

export interface VideoStudioLessonContext {
  lessonId: string
  lessonTitle: string
  lessonTitleAr: string
  moduleTitle: string
  moduleTitleAr: string
  courseId: string
  courseTitle: string
  courseTitleAr: string
}

export interface VideoStudioAssetSummary {
  id: string
  provider: VideoProviderId | string
  providerDisplayName: string
  providerVideoId: string | null
  status: string
  providerStatus: string | null
  providerProcessingStatus: string | null
  providerHealth: string | null
  durationSeconds: number | null
  resolution: string | null
  fileSize: number | null
  thumbnailUrl: string | null
  uploadedAt: string | null
  lastSync: string | null
  updatedAt: string | null
  providerVersion: number | null
  metadata: Record<string, unknown> | null
  originalFilename: string | null
  mimeType: string | null
  objectKey: string | null
  bucketName: string | null
}

export interface VideoStudioCostEstimate {
  storageCostUsd: number
  streamingCostUsd: number
  monthlyCostUsd: number
}

export interface VideoStudioPayload {
  asset: VideoStudioAssetSummary | null
  cost: VideoStudioCostEstimate | null
  uploadProvider: string | null
  context: VideoStudioLessonContext
}

export interface VideoStudioPipelineStage {
  id: string
  labelKey: string
  status: VideoStudioPipelineStageStatus
  progress: number
  startedAt: string | null
  endedAt: string | null
  durationMs: number | null
  logPreview: string | null
  error: string | null
  future?: boolean
}

export interface VideoStudioChapter {
  id: string
  title: string
  description: string
  color: string
  startSeconds: number
  endSeconds: number
  visible: boolean
}

export interface VideoStudioBookmark {
  id: string
  title: string
  timestampSeconds: number
  color: string
}

export interface VideoStudioTimelineLayer {
  id: string
  labelKey: string
  color: string
  future?: boolean
  markers: Array<{
    id: string
    startSeconds: number
    endSeconds?: number
    label: string
    color: string
  }>
}

export interface VideoStudioVersion {
  id: string
  versionNumber: number
  provider: string
  resolution: string | null
  durationSeconds: number | null
  createdAt: string
  status: string
  published: boolean
  notes: string | null
}

export interface VideoStudioActivityEvent {
  id: string
  timestamp: string
  actionKey: string
  user: string | null
  details: string
  source: string
}

export interface VideoStudioPlaybackConfig {
  autoplay: boolean
  resumePlayback: boolean
  continueWatching: boolean
  pictureInPicture: boolean
  adaptiveStreaming: boolean
  previewMode: boolean
  maxResolution: string
  defaultPlaybackRate: number
}

export interface VideoStudioGeneralDraft {
  displayTitle: string
  internalName: string
  description: string
  visibility: 'private' | 'enrolled' | 'preview'
  language: string
}
