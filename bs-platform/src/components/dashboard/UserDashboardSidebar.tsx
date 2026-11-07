'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import GroupedNav from '@/components/dashboard/ux/GroupedNav'
import type { DashboardNavGroup } from '@/lib/dashboard/nav-links'

interface UserDashboardSidebarProps {
  groups: DashboardNavGroup[]
  profileScore: number
  cvCount?: number
}

export default function UserDashboardSidebar({
  groups,
  profileScore,
  cvCount: initialCvCount = 0,
}: UserDashboardSidebarProps) {
  const t = useTranslations('dashboard_nav')
  const tg = useTranslations('dashboard_nav.groups')
  const [cvCount, setCvCount] = useState(initialCvCount)

  useEffect(() => {
    void fetch('/api/cv/list')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { profiles?: unknown[] } | null) => {
        if (data?.profiles) setCvCount(data.profiles.length)
      })
      .catch(() => {})
  }, [])

  return (
    <GroupedNav
      groups={groups}
      labelFor={(key) => t(key)}
      groupLabelFor={(key) => tg(key)}
      profileScore={profileScore}
      cvCount={cvCount}
      collapsible
    />
  )
}
