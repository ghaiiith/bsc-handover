'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ExternalLink } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import AdminNotificationsBell from '@/components/admin/AdminNotificationsBell'
import AdminMobileNav from '@/components/admin/AdminMobileNav'
import GlobalSearch from '@/components/search/GlobalSearch'
import { getAdminPageTitle } from '@/components/admin/AdminSidebar'
import type { User } from '@/types'

interface AdminHeaderProps {
  locale: string
  profile: User
  adminUserId: string
  navCounts: import('@/lib/admin/get-admin-nav-counts').AdminNavCounts
}

export default function AdminHeader({
  locale,
  profile,
  adminUserId,
  navCounts,
}: AdminHeaderProps) {
  const t = useTranslations('admin')
  const pathname = usePathname()
  const pageKey = getAdminPageTitle(pathname, locale)
  const isAr = locale === 'ar'
  const name = isAr ? profile.full_name_ar ?? profile.full_name : profile.full_name

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur px-4 md:px-6">
      <div className="flex flex-1 items-center gap-4 min-w-0">
        <h1 className="text-lg font-semibold truncate shrink-0">{t(pageKey)}</h1>
        <GlobalSearch className="hidden md:flex max-w-xs" />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <AdminMobileNav locale={locale} counts={navCounts} />
        <Link
          href={`/${locale}`}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'hidden sm:inline-flex gap-1.5'
          )}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('back_to_site')}
        </Link>

        <AdminNotificationsBell locale={locale} adminUserId={adminUserId} />

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden lg:inline max-w-[120px] truncate">
            {name}
          </span>
        </div>
      </div>
    </header>
  )
}
