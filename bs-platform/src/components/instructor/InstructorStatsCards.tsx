import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { BookOpen, Plus, Star, Tag, User, Users, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatPrice } from '@/lib/utils'
import type { InstructorDashboardStats } from '@/lib/instructor/get-instructor-dashboard'

interface InstructorStatsCardsProps {
  stats: InstructorDashboardStats
}

export default async function InstructorStatsCards({
  stats,
}: InstructorStatsCardsProps) {
  const t = await getTranslations('instructor')

  const cards = [
    {
      title: t('total_courses'),
      value: stats.totalCourses.toString(),
      icon: BookOpen,
    },
    {
      title: t('total_students'),
      value: stats.totalStudents.toString(),
      icon: Users,
    },
    {
      title: t('total_earnings'),
      value: formatPrice(stats.totalEarnings),
      icon: Wallet,
    },
    {
      title: t('average_rating'),
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—',
      icon: Star,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface InstructorDashboardActionsProps {
  locale: string
}

export async function InstructorDashboardActions({
  locale,
}: InstructorDashboardActionsProps) {
  const tCourses = await getTranslations('courses')
  const tInstructor = await getTranslations('instructor')

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={`/${locale}/instructor/courses/new`}
        className={cn(buttonVariants(), 'gap-2')}
      >
        <Plus className="h-4 w-4" />
        {tCourses('create_course')}
      </Link>
      <Link
        href={`/${locale}/instructor/courses`}
        className={cn(buttonVariants({ variant: 'outline' }))}
      >
        {tInstructor('manage_courses')}
      </Link>
      <Link
        href={`/${locale}/instructor/discounts`}
        className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
      >
        <Tag className="h-4 w-4" />
        {tInstructor('manage_discounts')}
      </Link>
      <Link
        href={`/${locale}/dashboard/profile`}
        className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
      >
        <User className="h-4 w-4" />
        {tInstructor('my_profile')}
      </Link>
    </div>
  )
}
