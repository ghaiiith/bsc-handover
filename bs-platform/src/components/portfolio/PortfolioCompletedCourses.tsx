'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircle2, GraduationCap } from 'lucide-react'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'
import { Badge } from '@/components/ui/badge'
import { useCourseCategories } from '@/components/categories/CourseCategoriesProvider'
import { cn } from '@/lib/utils'
import PortfolioReveal from '@/components/portfolio/PortfolioReveal'
import { PortfolioStagger, PortfolioStaggerItem } from '@/components/portfolio/PortfolioReveal'
import PortfolioSectionHeader from '@/components/portfolio/PortfolioSectionHeader'
import { usePortfolioTheme } from '@/components/portfolio/PortfolioThemeProvider'
import type { PortfolioCompletedCourse } from '@/types/portfolio'

interface PortfolioCompletedCoursesProps {
  locale: string
  courses: PortfolioCompletedCourse[]
}

export default function PortfolioCompletedCourses({
  locale,
  courses,
}: PortfolioCompletedCoursesProps) {
  const t = useTranslations('portfolio')
  const { theme } = usePortfolioTheme()
  const categories = useCourseCategories()
  const isAr = locale === 'ar'

  if (!courses.length) return null

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <PortfolioReveal>
        <PortfolioSectionHeader
          title={t('courses_section')}
          subtitle={t('completed_on_platform')}
          icon={<GraduationCap className="h-5 w-5" />}
        />
      </PortfolioReveal>
      <PortfolioStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const title = isAr ? course.title_ar : course.title
          const instructor = isAr
            ? course.instructor_name_ar ?? course.instructor_name
            : course.instructor_name
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1E]/80 via-transparent to-transparent" />
                  <Badge
                    className="absolute bottom-2 end-2 gap-1 border-0 text-white"
                    style={{ backgroundColor: `${theme.accent}e6` }}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {t('completed_badge')}
                  </Badge>
                </div>
                <div className="p-4">
                  <span
                    className="mb-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: theme.accentMuted, color: theme.accent }}
                  >
                    {categoryLabel}
                  </span>
                  <h3
                    className="line-clamp-2 font-semibold text-white transition-colors"
                    style={{ ['--hover' as string]: theme.accent }}
                  >
                    {title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{instructor}</p>
                </div>
              </Link>
            </PortfolioStaggerItem>
          )
        })}
      </PortfolioStagger>
      {courses.length >= 6 && (
        <PortfolioReveal className="mt-8 text-center">
          <Link
            href={`/${locale}/courses`}
            className="text-sm transition-opacity hover:opacity-80"
            style={{ color: theme.accent }}
          >
            {t('see_all_courses')}
          </Link>
        </PortfolioReveal>
      )}
    </section>
  )
}
