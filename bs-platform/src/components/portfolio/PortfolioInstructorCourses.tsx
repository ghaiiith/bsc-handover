'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BookOpen, Star, Users } from 'lucide-react'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'
import { useCourseCategories } from '@/components/categories/CourseCategoriesProvider'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/format-number'
import PortfolioReveal from '@/components/portfolio/PortfolioReveal'
import { PortfolioStagger, PortfolioStaggerItem } from '@/components/portfolio/PortfolioReveal'
import PortfolioSectionHeader from '@/components/portfolio/PortfolioSectionHeader'
import { usePortfolioTheme } from '@/components/portfolio/PortfolioThemeProvider'
import type { PortfolioTaughtCourse } from '@/types/portfolio'

interface PortfolioInstructorCoursesProps {
  locale: string
  courses: PortfolioTaughtCourse[]
}

export default function PortfolioInstructorCourses({
  locale,
  courses,
}: PortfolioInstructorCoursesProps) {
  const t = useTranslations('portfolio')
  const { theme } = usePortfolioTheme()
  const categories = useCourseCategories()
  const isAr = locale === 'ar'

  if (!courses.length) return null

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <PortfolioReveal>
        <PortfolioSectionHeader
          title={t('taught_courses_section')}
          subtitle={t('taught_courses_subtitle')}
          icon={<BookOpen className="h-5 w-5" />}
        />
      </PortfolioReveal>
      <PortfolioStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const title = isAr ? course.title_ar : course.title
          const category = categories.find((c) => c.value === course.category)
          const categoryLabel = category
            ? isAr
              ? category.label
              : category.labelEn
            : course.category

          return (
            <PortfolioStaggerItem key={course.id}>
              <Link
                href={`/${locale}/courses/${course.id}`}
                className={cn(
                  'group relative block overflow-hidden rounded-2xl border transition-all duration-300',
                  theme.cardBorder,
                  theme.cardBg,
                  theme.cardHover
                )}
              >
                <div className="relative aspect-video overflow-hidden bg-slate-900">
                  {course.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt={title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-600">
                      {BRAND_FULL_NAME}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1E]/90 via-[#0A0F1E]/20 to-transparent" />
                  <div className="absolute bottom-3 start-3 end-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
                      <Users className="h-3 w-3" />
                      <span className="num-en">{formatCount(course.enrollment_count)}</span>
                    </span>
                    {course.avg_rating > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="num-en">{course.avg_rating.toFixed(1)}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
                      <BookOpen className="h-3 w-3" />
                      <span className="num-en">{formatCount(course.total_lessons)}</span>
                      <span>{t('lessons_label')}</span>
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <span
                    className="mb-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: theme.accentMuted, color: theme.accent }}
                  >
                    {categoryLabel}
                  </span>
                  <h3 className="line-clamp-2 font-semibold text-white">{title}</h3>
                </div>
              </Link>
            </PortfolioStaggerItem>
          )
        })}
      </PortfolioStagger>
    </section>
  )
}
