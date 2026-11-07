import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import Navbar from '@/components/shared/Navbar'
import CourseStudioSidebar from '@/components/instructor/studio/CourseStudioSidebar'
import { requireInstructorAccess } from '@/lib/instructor/require-instructor'
import { getCourseStudioContext } from '@/lib/instructor/studio/get-course-studio-data'
import { NOINDEX_METADATA } from '@/lib/seo/metadata'

export const metadata: Metadata = NOINDEX_METADATA

interface StudioLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function CourseStudioLayout({ children, params }: StudioLayoutProps) {
  const { id } = await params
  const locale = await getLocale()
  const { userId } = await requireInstructorAccess(locale)

  const ctx = await getCourseStudioContext(id, userId)
  if (!ctx) notFound()

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="flex flex-col md:flex-row">
        <CourseStudioSidebar locale={locale} course={ctx.course} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
