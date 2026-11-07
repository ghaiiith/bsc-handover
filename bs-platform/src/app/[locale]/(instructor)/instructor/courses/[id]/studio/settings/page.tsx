import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Ticket } from 'lucide-react'
import CourseStudioHeader from '@/components/instructor/studio/CourseStudioHeader'
import StudioSettingsForm from '@/components/instructor/studio/StudioSettingsForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudioSettingsPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('studio.settings')
  const { userId } = await requireInstructorAccess(locale)
  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  return (
    <>
      <CourseStudioHeader
        locale={locale}
        course={ctx.course}
        title={t('page_title')}
        subtitle={t('page_subtitle')}
      />
      <div className="mt-6 space-y-6">
        <StudioSettingsForm locale={locale} course={ctx.course} />
        <Card className="edu-card shadow-none">
          <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t('coupons_title')}</p>
              <p className="text-sm text-muted-foreground">{t('coupons_manage_hint')}</p>
            </div>
            <Link
              href={`/${locale}/instructor/discounts`}
              className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 inline-flex')}
            >
              <Ticket className="h-4 w-4" />
              {t('manage_coupons')}
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
