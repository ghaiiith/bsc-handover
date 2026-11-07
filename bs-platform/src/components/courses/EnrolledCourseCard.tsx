import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { BookOpen, CheckCircle2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import type { EnrolledCourseItem } from '@/lib/courses/get-my-enrollments'

interface EnrolledCourseCardProps {
  item: EnrolledCourseItem
  locale: string
}

export default async function EnrolledCourseCard({
  item,
  locale,
}: EnrolledCourseCardProps) {
  const t = await getTranslations('courses')
  const isAr = locale === 'ar'

  const title = isAr ? item.course.title_ar : item.course.title
  const instructorName = isAr
    ? item.instructor.full_name_ar ?? item.instructor.full_name
    : item.instructor.full_name

  const continueHref =
    item.continueLessonSlug && item.course.slug
      ? buildLearnLessonPath(locale, item.course.slug, item.continueLessonSlug)
      : `/${locale}/courses/${item.course.id}`

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video w-full bg-muted">
        {item.course.thumbnail_url ? (
          <Image
            src={item.course.thumbnail_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/5">
            <BookOpen className="h-10 w-10 text-primary/40" />
          </div>
        )}
        {item.isComplete && (
          <Badge className="absolute top-2 start-2 bg-emerald-600 text-white hover:bg-emerald-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('completed')} ✓
          </Badge>
        )}
      </div>

      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="font-semibold line-clamp-2 leading-snug">{title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={item.instructor.avatar_url ?? ''} />
              <AvatarFallback className="text-[10px]">
                {instructorName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {instructorName}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('progress')}</span>
            <span className="num-en">{item.progressPercent}%</span>
          </div>
          <Progress value={item.progressPercent} />
          <p className="text-xs text-muted-foreground num-en">
            {item.completedLessons} / {item.totalLessons} {t('lessons')}
          </p>
        </div>

        <Link
          href={continueHref}
          className={cn(buttonVariants({ size: 'sm' }), 'w-full')}
        >
          {item.isComplete ? t('review_course') : t('continue_learning')}
        </Link>
      </CardContent>
    </Card>
  )
}
