'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface ResourceLessonSection {
  id: string
  title: string
  lessons: { id: string; title: string }[]
}

interface ResourceLessonSelectProps {
  sections: ResourceLessonSection[]
  value: string
  onChange: (lessonId: string) => void
  className?: string
}

export default function ResourceLessonSelect({
  sections,
  value,
  onChange,
  className,
}: ResourceLessonSelectProps) {
  const t = useTranslations('studio.resources')

  const selectValue = value || 'course_wide'

  const displayLabel = useMemo(() => {
    if (!value) return t('course_wide')
    for (const section of sections) {
      const lesson = section.lessons.find((l) => l.id === value)
      if (lesson) {
        return `${section.title} · ${lesson.title}`
      }
    }
    return t('unknown_lesson')
  }, [sections, value, t])

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onChange(!v || v === 'course_wide' ? '' : v)}
    >
      <SelectTrigger
        className={cn(
          'h-auto min-h-9 w-full py-2 [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal',
          className
        )}
      >
        <SelectValue placeholder={t('link_lesson')}>
          <span className="flex items-start gap-2 text-left">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-primary/80" />
            <span className="min-w-0 leading-snug">{displayLabel}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="max-h-80 min-w-[min(100%,28rem)] w-[var(--anchor-width)] sm:min-w-[28rem]"
      >
        <SelectGroup>
          <SelectItem value="course_wide" className="py-2">
            <span className="font-medium">{t('course_wide')}</span>
          </SelectItem>
        </SelectGroup>

        {sections.length > 0 && (
          <>
            <SelectSeparator />
            {sections.map((section) => (
              <SelectGroup key={section.id}>
                <SelectLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </SelectLabel>
                {section.lessons.map((lesson) => (
                  <SelectItem
                    key={lesson.id}
                    value={lesson.id}
                    className="py-2 pl-3 [&_[data-slot=select-item-text]]:whitespace-normal"
                  >
                    <span className="block leading-snug">{lesson.title}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  )
}
