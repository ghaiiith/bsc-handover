'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type {
  VideoStudioChapter,
  VideoStudioGeneralDraft,
  VideoStudioPayload,
} from '@/types/video-studio'

export interface VideoStudioContextValue {
  payload: VideoStudioPayload | null
  locale: string
  generalDraft: VideoStudioGeneralDraft
  setGeneralDraft: Dispatch<SetStateAction<VideoStudioGeneralDraft>>
  chapters: VideoStudioChapter[]
  setChapters: Dispatch<SetStateAction<VideoStudioChapter[]>>
}

const VideoStudioContext = createContext<VideoStudioContextValue | null>(null)

function initialGeneralDraft(
  payload: VideoStudioPayload | null,
  locale: string
): VideoStudioGeneralDraft {
  return {
    displayTitle: payload?.context.lessonTitle ?? '',
    internalName: payload?.asset?.originalFilename ?? '',
    description: '',
    visibility: 'private',
    language: locale === 'ar' ? 'ar' : 'en',
  }
}

export interface VideoStudioProviderProps {
  payload: VideoStudioPayload | null
  locale: string
  initialChapters?: VideoStudioChapter[]
  children: ReactNode
}

export function VideoStudioProvider({
  payload,
  locale,
  initialChapters = [],
  children,
}: VideoStudioProviderProps) {
  const [generalDraft, setGeneralDraft] = useState<VideoStudioGeneralDraft>(() =>
    initialGeneralDraft(payload, locale)
  )
  const [chapters, setChapters] = useState<VideoStudioChapter[]>(initialChapters)

  const value = useMemo<VideoStudioContextValue>(
    () => ({ payload, locale, generalDraft, setGeneralDraft, chapters, setChapters }),
    [payload, locale, generalDraft, chapters]
  )

  return <VideoStudioContext.Provider value={value}>{children}</VideoStudioContext.Provider>
}

export function useVideoStudio(): VideoStudioContextValue {
  const ctx = useContext(VideoStudioContext)
  if (!ctx) {
    throw new Error('useVideoStudio must be used within a VideoStudioProvider')
  }
  return ctx
}
