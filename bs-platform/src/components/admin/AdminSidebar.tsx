'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ADMIN_NAV_GROUPS } from '@/lib/admin/admin-nav-config'
import type { AdminNavCounts } from '@/lib/admin/get-admin-nav-counts'
import BrandLogo from '@/components/brand/BrandLogo'

interface AdminSidebarProps {
  locale: string
  counts: AdminNavCounts
}

export default function AdminSidebar({ locale, counts }: AdminSidebarProps) {
  const t = useTranslations('admin')
  const tg = useTranslations('admin.nav_groups')
  const pathname = usePathname()
  const base = `/${locale}/admin`
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const isActive = (href: string) => {
    const full = href ? `${base}${href}` : base
    if (href === '') {
      return pathname === base || pathname === `${base}/`
    }
    return pathname.startsWith(full)
  }

  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden h-svh w-64 flex-col border-e bg-card md:flex">
      <div className="shrink-0 border-b p-4">
        <BrandLogo locale={locale} orientation="horizontal" mode="compact" iconSize={28} />
        <p className="mt-1 text-xs text-muted-foreground">{t('panel_title')}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {ADMIN_NAV_GROUPS.map((group) => {
          const hasActive = group.items.some((item) => isActive(item.href))
          const isCollapsed = collapsed[group.key] && !hasActive

          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                }
                className="mb-1 flex w-full items-center justify-between px-3 py-1"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tg(group.key)}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform',
                    isCollapsed && '-rotate-90'
                  )}
                />
              </button>
              {!isCollapsed && (
                <nav className="space-y-0.5">
                  {group.items.map((item) => {
                    const href = item.href ? `${base}${item.href}` : base
                    const active = isActive(item.href)
                    const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.key}
                        href={href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{t(item.key)}</span>
                        {badgeCount > 0 && (
                          <Badge
                            variant={active ? 'secondary' : 'default'}
                            className="h-5 min-w-5 px-1.5 text-xs"
                          >
                            {badgeCount}
                          </Badge>
                        )}
                      </Link>
                    )
                  })}
                </nav>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export function getAdminPageTitle(pathname: string, locale: string): string {
  const base = `/${locale}/admin`
  const relative = pathname.replace(base, '') || '/'

  if (relative === '/' || relative === '') return 'overview'
  if (relative.startsWith('/role-requests')) return 'role_requests'
  if (relative.startsWith('/users')) return 'users'
  if (relative.startsWith('/instructor-requests')) return 'instructor_requests'
  if (relative.startsWith('/company-requests')) return 'company_requests'
  if (relative.startsWith('/freelancer-requests')) return 'freelancer_requests'
  if (relative.startsWith('/categories')) return 'categories'
  if (relative.startsWith('/courses')) return 'courses'
  if (relative.startsWith('/discounts')) return 'discounts'
  if (relative.startsWith('/jobs')) return 'jobs'
  if (relative.startsWith('/services')) return 'services'
  if (relative.startsWith('/payments')) return 'payments'
  if (relative.startsWith('/analytics')) return 'analytics'
  if (relative.startsWith('/settings')) return 'settings'
  if (relative.startsWith('/notifications')) return 'notifications'
  if (relative.startsWith('/community')) return 'community'
  return 'overview'
}
