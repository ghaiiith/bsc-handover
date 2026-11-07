'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  BookOpen,
  FileText,
  ListVideo,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CourseAssistantPanel from '@/components/chat/CourseAssistantPanel'
import LessonQaPanel from '@/components/courses/LessonQaPanel'
import LessonResourcesPanel from '@/components/courses/LessonResourcesPanel'
import LearnMobileCurriculumSheet from '@/components/courses/LearnMobileCurriculumSheet'
import { ToolsPanelToggle } from '@/components/courses/LessonPlayerShell'
import type { LessonResourceRow } from '@/lib/courses/get-lesson-resources'
import type { LessonQaThreadWithMessages } from '@/types/lesson-qa'
import { cn } from '@/lib/utils'

interface LessonPlayerToolsPanelProps {
  locale: string
  courseId: string
  courseTitle: string
  lessonId: string
  resources: LessonResourceRow[]
  initialTab?: string
  highlightThreadId?: string
  initialQaThread?: LessonQaThreadWithMessages | null
  canAccessAi?: boolean
  overviewContent?: ReactNode
}

type ToolsTab = 'overview' | 'curriculum' | 'assistant' | 'resources' | 'discussions'

function normalizeTab(value: string | undefined, canAccessAi: boolean): ToolsTab {
  if (value === 'qa' || value === 'discussions') return 'discussions'
  if (value === 'resources') return 'resources'
  if (value === 'curriculum') return 'curriculum'
  if (value === 'overview') return 'overview'
  if (value === 'assistant' && canAccessAi) return 'assistant'
  if (!value) return canAccessAi ? 'assistant' : 'overview'
  return canAccessAi ? 'assistant' : 'overview'
}

export default function LessonPlayerToolsPanel({
  locale,
  courseId,
  courseTitle,
  lessonId,
  resources,
  initialTab,
  highlightThreadId,
  initialQaThread = null,
  canAccessAi = true,
  overviewContent,
}: LessonPlayerToolsPanelProps) {
  const t = useTranslations('courses.learn')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<ToolsTab>(() =>
    normalizeTab(initialTab, canAccessAi)
  )

  useEffect(() => {
    if (initialTab) {
      setTab(normalizeTab(initialTab, canAccessAi))
    }
  }, [initialTab, canAccessAi])

  useEffect(() => {
    if (initialTab) return
    const media = window.matchMedia('(max-width: 1023px)')
    const syncDefault = () => {
      setTab(media.matches ? 'overview' : normalizeTab(undefined, canAccessAi))
    }
    syncDefault()
    media.addEventListener('change', syncDefault)
    return () => media.removeEventListener('change', syncDefault)
  }, [initialTab, canAccessAi, lessonId])

  const handleTabChange = (value: string) => {
    const next = normalizeTab(value, canAccessAi)
    setTab(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'discussions') {
      params.set('tab', 'qa')
    } else if (next === 'assistant' || next === 'resources' || next === 'overview' || next === 'curriculum') {
      if (next === 'overview' || next === 'curriculum') {
        params.delete('tab')
      } else {
        params.set('tab', next === 'assistant' ? 'assistant' : 'resources')
      }
      params.delete('thread')
    } else {
      params.delete('tab')
      params.delete('thread')
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const qaUnread = useMemo(() => {
    if (!initialQaThread) return false
    const last = initialQaThread.messages.at(-1)
    return last?.sender_role === 'instructor'
  }, [initialQaThread])

  const tabTriggerClass =
    'h-11 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm lg:max-h-none max-lg:min-h-[22rem]">
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="shrink-0 border-b border-border/60 bg-muted/20 px-2 pt-2">
          <div className="mb-1 hidden items-center justify-end px-1 lg:flex">
            <ToolsPanelToggle />
          </div>
          <TabsList
            className={cn(
              'h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 pb-2 scrollbar-none',
              'max-lg:flex max-lg:flex-nowrap'
            )}
          >
            <TabsTrigger value="overview" className={tabTriggerClass}>
              <BookOpen className="size-3.5 shrink-0" />
              <span>{t('tab_overview')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="curriculum"
              className={cn(tabTriggerClass, 'lg:hidden')}
            >
              <ListVideo className="size-3.5 shrink-0" />
              <span>{t('tab_curriculum')}</span>
            </TabsTrigger>
            {canAccessAi ? (
              <TabsTrigger value="assistant" className={tabTriggerClass}>
                <Sparkles className="size-3.5 shrink-0" />
                <span>{t('tab_assistant')}</span>
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="resources" className={tabTriggerClass}>
              <FileText className="size-3.5 shrink-0" />
              <span>{t('tab_resources')}</span>
              {resources.length > 0 && (
                <span className="num-en rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">
                  {resources.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="discussions" className={tabTriggerClass}>
              <MessageSquare className="size-3.5 shrink-0" />
              <span>{t('tab_discussions')}</span>
              {qaUnread && (
                <span className="size-2 rounded-full bg-primary" aria-hidden />
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="overview"
          className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-4 data-[state=inactive]:hidden"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
            {overviewContent ? (
              overviewContent
            ) : (
              <p className="text-sm text-muted-foreground">{t('overview_empty')}</p>
            )}
            <div className="lg:hidden">
              <LearnMobileCurriculumSheet />
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="curriculum"
          className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-4 data-[state=inactive]:hidden lg:hidden"
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('curriculum_hint')}</p>
            <LearnMobileCurriculumSheet />
          </div>
        </TabsContent>

        {canAccessAi ? (
          <TabsContent
            value="assistant"
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-3 data-[state=inactive]:hidden sm:p-4"
          >
            <CourseAssistantPanel
              locale={locale}
              courseId={courseId}
              courseTitle={courseTitle}
              lessonId={lessonId}
              variant="tab"
            />
          </TabsContent>
        ) : null}

        <TabsContent
          value="resources"
          className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-4 data-[state=inactive]:hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <LessonResourcesPanel locale={locale} resources={resources} />
          </div>
        </TabsContent>

        <TabsContent
          value="discussions"
          className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-4 data-[state=inactive]:hidden"
        >
          <LessonQaPanel
            locale={locale}
            courseId={courseId}
            lessonId={lessonId}
            initialThread={initialQaThread}
            highlightThreadId={highlightThreadId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
