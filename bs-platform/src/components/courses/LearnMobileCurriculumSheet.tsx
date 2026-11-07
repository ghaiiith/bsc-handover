'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ListVideo } from 'lucide-react'
import LessonCurriculumSidebar from '@/components/courses/LessonCurriculumSidebar'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface LearnMobileCurriculumSheetProps {
  className?: string
  triggerClassName?: string
}

export default function LearnMobileCurriculumSheet({
  className,
  triggerClassName,
}: LearnMobileCurriculumSheetProps) {
  const t = useTranslations('courses')
  const tLearn = useTranslations('courses.learn')
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('lg:hidden', className)}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'h-11 w-full justify-center gap-2 rounded-xl border-border/70 bg-card/50',
          triggerClassName
        )}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ListVideo className="size-4" />
        {tLearn('expand_curriculum')}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="p-0">
          <SheetHeader>
            <SheetTitle>{t('curriculum')}</SheetTitle>
            <SheetDescription>{t('progress')}</SheetDescription>
          </SheetHeader>
          <SheetBody className="px-0 pt-2">
            <div className="h-[min(70dvh,34rem)] [&_.rounded-xl]:rounded-none [&_.rounded-xl]:border-0 [&_.rounded-xl]:shadow-none">
              <LessonCurriculumSidebar />
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  )
}
