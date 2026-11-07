import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'
import CourseCard from '@/components/courses/CourseCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CourseListItem } from '@/lib/courses/list-courses'

interface FeaturedCoursesSectionProps {
  courses: CourseListItem[]
}

export default async function FeaturedCoursesSection({ courses }: FeaturedCoursesSectionProps) {
  const t = await getTranslations('landing.courses')
  const locale = await getLocale()
  const isRTL = locale === 'ar'
  const Arrow = isRTL ? ArrowLeft : ArrowRight

  return (
    <section id="courses" className="bg-muted/20 py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        {courses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div key={course.id} className="edu-card overflow-hidden [&_.group]:hover:shadow-none">
                <CourseCard course={course} locale={locale} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        )}

        <div className="mt-12 text-center">
          <Link
            href={`/${locale}/courses`}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}
          >
            {t('view_all')}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
