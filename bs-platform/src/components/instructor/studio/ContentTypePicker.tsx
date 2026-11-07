'use client'

import { useTranslations } from 'next-intl'
import { Film, HelpCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LessonType } from '@/types'
import { cn } from '@/lib/utils'

const TYPES: { type: LessonType; icon: typeof Film }[] = [
  { type: 'video', icon: Film },
  { type: 'quiz', icon: HelpCircle },
]

interface ContentTypePickerProps {
  onSelect: (type: LessonType) => void
  onCancel: () => void
}

export default function ContentTypePicker({ onSelect, onCancel }: ContentTypePickerProps) {
  const t = useTranslations('studio.curriculum.types')

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t('pick')}</p>
        <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {TYPES.map(({ type, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-2.5 py-2 text-start text-xs',
              'hover:border-primary/40 hover:bg-primary/5 transition-colors'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{t(type)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
