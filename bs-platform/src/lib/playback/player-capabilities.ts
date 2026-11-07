import type { PlaybackProtectionCapabilities } from '@/types/content-protection'
import type {
  PlayerAiCapabilities,
  PlayerCapabilities,
  PlaybackEngineType,
  ResolvedPlaybackConfig,
} from '@/types/video-player'

export interface CapabilityResolveInput {
  engine: PlaybackEngineType
  hasSession: boolean
  hasSubtitles: boolean
  hasChapters: boolean
  hasTimelineEvents: boolean
  hasSeekPreview: boolean
  hasWatermark: boolean
  protection?: PlaybackProtectionCapabilities | null
  qualityCount: number
}

const DEFAULT_AI_CAPABILITIES: PlayerAiCapabilities = {
  supportsSummary: false,
  supportsChapters: false,
  supportsTranscript: false,
  supportsSearch: false,
  supportsAskAi: false,
  supportsTranslation: false,
  supportsVoiceNotes: false,
  supportsSmartBookmarks: false,
  supportsKnowledgeTimeline: false,
}

/** Derives player UX capabilities — never uses provider names. */
export function resolvePlayerCapabilities(
  input: CapabilityResolveInput
): PlayerCapabilities {
  const isEmbed = input.engine === 'embed'
  const hasStream = input.engine === 'html5' || input.engine === 'hls'

  return {
    supportsResume: hasStream,
    supportsBookmarks: hasStream,
    supportsPlaybackSession: input.hasSession,
    supportsChapters: input.hasChapters,
    supportsSubtitles: input.hasSubtitles,
    supportsQualitySelection: input.qualityCount > 1,
    supportsPlaybackRates: hasStream,
    supportsPiP: hasStream && typeof document !== 'undefined' && document.pictureInPictureEnabled,
    supportsFullscreen: true,
    supportsWatermark: input.hasWatermark,
    supportsDrm: input.protection?.supportsDrm ?? false,
    supportsThumbnailPreview: input.hasSeekPreview,
    supportsInteractiveTimeline: input.hasTimelineEvents,
    supportsNotes: hasStream,
    supportsQuizzes: input.hasTimelineEvents,
  }
}

export function resolveAiCapabilities(): PlayerAiCapabilities {
  return { ...DEFAULT_AI_CAPABILITIES }
}

export function enrichPlaybackConfigCapabilities(
  config: ResolvedPlaybackConfig,
  qualityCount: number
): ResolvedPlaybackConfig {
  const capabilities = resolvePlayerCapabilities({
    engine: config.engine,
    hasSession: Boolean(config.sessionEndpoint),
    hasSubtitles: (config.subtitles?.length ?? 0) > 0,
    hasChapters: (config.chapters?.length ?? 0) > 0,
    hasTimelineEvents: (config.timelineEvents?.length ?? 0) > 0,
    hasSeekPreview: Boolean(config.seekPreview),
    hasWatermark: Boolean(config.watermark?.enabled),
    protection: undefined,
    qualityCount,
  })

  return {
    ...config,
    capabilities,
    aiCapabilities: config.aiCapabilities ?? resolveAiCapabilities(),
  }
}

export function capabilityEnabled(
  capabilities: PlayerCapabilities | undefined,
  key: keyof PlayerCapabilities
): boolean {
  return capabilities?.[key] === true
}
