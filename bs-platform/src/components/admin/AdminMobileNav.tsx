'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ADMIN_NAV_GROUPS } from '@/lib/admin/admin-nav-config'
import type { AdminNavCounts } from '@/lib/admin/get-admin-nav-counts'

interface AdminMobileNavProps {
  locale: string
  counts: AdminNavCounts
}

export default function AdminMobileNav({ locale, counts }: AdminMobileNavProps) {
  const t = useTranslations('admin')
  const tn = useTranslations('nav')
  const tg = useTranslations('admin.nav_groups')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const base = `/${locale}/admin`

  const isActive = (href: string) => {
    const full = href ? `${base}${href}` : base
    if (href === '') {
      return pathname === base || pathname === `${base}/`
    }
    return pathname.startsWith(full)
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label={tn('open_menu')}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-y-0 start-0 top-0 left-0 h-svh w-64 max-w-[85vw] !translate-x-0 !translate-y-0 flex flex-col rounded-none rounded-e-xl border-y-0 border-s-0 p-0 gap-0 sm:max-w-none data-open:slide-in-from-left data-closed:slide-out-to-left"
        >
          <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <DialogTitle className="text-base">{t('panel_title')}</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label={tn('close_menu')}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <nav className="flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-4">
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.key}>
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tg(group.key)}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const href = item.href ? `${base}${item.href}` : base
                    const active = isActive(item.href)
                    const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.key}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-muted'
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
                </div>
              </div>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  )
}
