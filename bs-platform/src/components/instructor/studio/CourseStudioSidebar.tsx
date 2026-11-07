'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Award,
  BarChart3,
  BookOpen,
  FileStack,
  GraduationCap,
  HelpCircle,
  Layers,
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import CourseStatusBadge from '@/components/courses/CourseStatusBadge'
import { studioBasePath, type StudioSection } from '@/lib/instructor/studio/studio-paths'
import type { Course } from '@/types'

interface CourseStudioSidebarProps {
  locale: string
  course: Course
}

type NavItem = { section: StudioSection; icon: typeof LayoutDashboard }

const STUDIO_GROUPS: { key: string; items: NavItem[] }[] = [
  {
    key: 'overview',
    items: [{ section: 'overview', icon: LayoutDashboard }],
  },
  {
    key: 'content',
    items: [
      { section: 'information', icon: BookOpen },
      { section: 'curriculum', icon: Layers },
      { section: 'resources', icon: FileStack },
      { section: 'quizzes', icon: HelpCircle },
    ],
  },
  {
    key: 'people',
    items: [
      { section: 'students', icon: Users },
      { section: 'reviews', icon: MessageSquare },
      { section: 'qa', icon: MessageCircle },
    ],
  },
  {
    key: 'certificates',
    items: [{ section: 'certificates', icon: Award }],
  },
  {
    key: 'insights',
    items: [{ section: 'analytics', icon: BarChart3 }],
  },
  {
    key: 'settings',
    items: [{ section: 'settings', icon: Settings }],
  },
]

const MOBILE_PRIMARY: StudioSection[] = [
  'overview',
  'curriculum',
  'students',
  'certificates',
  'analytics',
]

export default function CourseStudioSidebar({ locale, course }: CourseStudioSidebarProps) {
  const t = useTranslations('studio.nav')
  const tg = useTranslations('studio.nav_groups')
  const pathname = usePathname()
  const base = studioBasePath(locale, course.id)
  const isAr = locale === 'ar'
  const title = isAr ? course.title_ar : course.title
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const hrefFor = (section: StudioSection) =>
    section === 'overview' ? base : `${base}/${section}`

  const isActive = (section: StudioSection) => {
    const href = hrefFor(section)
    if (section === 'overview') {
      return pathname === base || pathname === `${base}/`
    }
    return pathname.startsWith(href)
  }

  const allItems = STUDIO_GROUPS.flatMap((g) => g.items)

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-e bg-card/80 backdrop-blur-sm">
        <div className="border-b p-4">
          <Link
            href={`/${locale}/instructor/courses`}
            className="mb-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            {t('back_to_courses')}
          </Link>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {t('studio_label')}
          </p>
          <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{title}</h2>
          <div className="mt-2">
            <CourseStatusBadge status={course.status} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {STUDIO_GROUPS.map((group) => {
            const hasActive = group.items.some((item) => isActive(item.section))
            const isCollapsed = collapsed[group.key] && !hasActive && group.items.length > 1

            return (
              <div key={group.key}>
                {group.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                    }
                    className="mb-0.5 flex w-full items-center justify-between px-3 py-1"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {tg(group.key)}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 text-muted-foreground transition-transform',
                        isCollapsed && '-rotate-90'
                      )}
                    />
                  </button>
                )}
                {!isCollapsed && (
                  <nav className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.section)
                      return (
                        <Link
                          key={item.section}
                          href={hrefFor(item.section)}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t(item.section)}</span>
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

      <nav className="md:hidden flex gap-1 overflow-x-auto border-b bg-card px-2 py-2">
        {allItems
          .filter((item) => MOBILE_PRIMARY.includes(item.section))
          .map((item) => {
            const active = isActive(item.section)
            return (
              <Link
                key={item.section}
                href={hrefFor(item.section)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {t(item.section)}
              </Link>
            )
          })}
      </nav>
    </>
  )
}
