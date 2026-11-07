import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Briefcase, GraduationCap, ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { RoleRequestStats } from '@/lib/admin/get-role-requests'

interface AdminRoleRequestsOverviewProps {
  locale: string
  stats: RoleRequestStats
}

export default async function AdminRoleRequestsOverview({
  locale,
  stats,
}: AdminRoleRequestsOverviewProps) {
  const t = await getTranslations('admin')

  const cards = [
    {
      key: 'instructor' as const,
      href: `/${locale}/admin/role-requests?role=instructor`,
      icon: GraduationCap,
      label: t('instructor_requests'),
      pending: stats.instructor.pending,
    },
    {
      key: 'company' as const,
      href: `/${locale}/admin/role-requests?role=company`,
      icon: Briefcase,
      label: t('company_requests'),
      pending: stats.company.pending,
    },
    {
      key: 'freelancer' as const,
      href: `/${locale}/admin/role-requests?role=freelancer`,
      icon: ShoppingBag,
      label: t('freelancer_requests'),
      pending: stats.freelancer.pending,
    },
  ]

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('role_requests_section_title')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('role_requests_section_subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/admin/role-requests`}
          className="text-xs font-medium text-primary hover:underline"
        >
          {t('manage_role_requests')}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.key}
              href={card.href}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="rounded-lg bg-primary/10 p-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{card.label}</p>
                <p className="text-xs text-muted-foreground">
                  {t('pending_role_requests_count', { count: card.pending })}
                </p>
              </div>
              {card.pending > 0 ? (
                <Badge className="shrink-0">{card.pending}</Badge>
              ) : null}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
