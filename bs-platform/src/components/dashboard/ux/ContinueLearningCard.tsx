import Link from 'next/link'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/format-number'

interface ContinueLearningCardProps {
  locale: string
  courseTitle: string
  courseSlug: string
  thumbnailUrl?: string | null
  progressPercent: number
  completedLessons: number
  totalLessons: number
  continueLessonSlug?: string
  ctaLabel: string
  progressLabel: string
}

export default function ContinueLearningCard({
  locale,
  courseTitle,
  courseSlug,
  thumbnailUrl,
  progressPercent,
  completedLessons,
  totalLessons,
  continueLessonSlug,
  ctaLabel,
  progressLabel,
}: ContinueLearningCardProps) {
  const lessonHref = continueLessonSlug
    ? `/${locale}/learn/${courseSlug}/${continueLessonSlug}`
    : `/${locale}/courses/${courseSlug}`

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-video w-full shrink-0 bg-muted sm:w-48 md:w-56">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 224px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Play className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center gap-3 p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {progressLabel}
            </p>
            <h2 className="mt-1 line-clamp-2 text-lg font-semibold">{courseTitle}</h2>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatCount(completedLessons)} / {formatCount(totalLessons)}
              </span>
              <span className="num-en">{formatCount(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <Link href={lessonHref} className={cn(buttonVariants(), 'w-fit gap-2')}>
            <Play className="h-4 w-4" />
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
