'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  isDashboardNavLinkActive,
  type DashboardNavGroup,
} from '@/lib/dashboard/nav-links'
import { getDashboardNavIcon } from '@/lib/dashboard/nav-icons'

interface GroupedNavProps {
  groups: DashboardNavGroup[]
  labelFor: (key: string) => string
  groupLabelFor: (key: string) => string
  profileScore?: number
  cvCount?: number
  badgeFor?: (labelKey: string) => number | undefined
  collapsible?: boolean
}

export default function GroupedNav({
  groups,
  labelFor,
  groupLabelFor,
  profileScore,
  cvCount = 0,
  badgeFor,
  collapsible = true,
}: GroupedNavProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleGroup = (key: string) => {
    if (!collapsible) return
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsible && collapsed[group.key]
        const hasActive = group.links.some((link) =>
          isDashboardNavLinkActive(pathname, link)
        )

        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className={cn(
                'mb-1 flex w-full items-center justify-between px-3 py-1',
                collapsible && 'cursor-pointer hover:text-foreground',
                !collapsible && 'cursor-default'
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {groupLabelFor(group.key)}
              </span>
              {collapsible && (
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform',
                    isCollapsed && !hasActive && '-rotate-90'
                  )}
                />
              )}
            </button>

            {(!isCollapsed || hasActive) && (
              <nav className="space-y-0.5">
                {group.links.map((link) => {
                  const active = isDashboardNavLinkActive(pathname, link)
                  const Icon = getDashboardNavIcon(link.iconKey)
                  const badge = badgeFor?.(link.labelKey) ?? link.badge

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={link.exact ? false : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <span className="relative shrink-0">
                        <Icon className="h-4 w-4" />
                        {link.cvBadge && cvCount > 0 && (
                          <span className="absolute -top-1 -end-1 h-2 w-2 rounded-full bg-amber-500" />
                        )}
                      </span>
                      <span className="flex-1 truncate">
                        {labelFor(link.labelKey)}
                        {link.score && profileScore != null && (
                          <span className="num-en ms-1 opacity-80">
                            ({profileScore}%)
                          </span>
                        )}
                      </span>
                      {badge != null && badge > 0 && (
                        <Badge
                          variant={active ? 'secondary' : 'default'}
                          className="h-5 min-w-5 px-1.5 text-[10px]"
                        >
                          {badge}
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
  )
}
