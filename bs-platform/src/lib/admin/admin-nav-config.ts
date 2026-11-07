import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Briefcase,
  ShoppingBag,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  Tag,
  Tags,
  Video,
  Send,
  Flag,
  FileCode2,
  Users2,
  FileText,
  Download,
  Images,
  Newspaper,
  Megaphone,
} from 'lucide-react'
import type { AdminNavCounts } from '@/lib/admin/get-admin-nav-counts'

export type AdminNavItem = {
  key: string
  href: string
  icon: LucideIcon
  badgeKey?: keyof AdminNavCounts
}

export type AdminNavGroup = {
  key: string
  items: AdminNavItem[]
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    key: 'operate',
    items: [
      { key: 'overview', href: '', icon: LayoutDashboard },
      {
        key: 'instructor_requests',
        href: '/instructor-requests',
        icon: GraduationCap,
        badgeKey: 'pendingInstructorRequests',
      },
      {
        key: 'company_requests',
        href: '/company-requests',
        icon: Briefcase,
        badgeKey: 'pendingCompanyRequests',
      },
      {
        key: 'freelancer_requests',
        href: '/freelancer-requests',
        icon: ShoppingBag,
        badgeKey: 'pendingFreelancerRequests',
      },
      {
        key: 'courses',
        href: '/courses',
        icon: BookOpen,
        badgeKey: 'pendingCourses',
      },
      { key: 'categories', href: '/categories', icon: Tags },
    ],
  },
  {
    key: 'monitor',
    items: [
      { key: 'users', href: '/users', icon: Users },
      { key: 'candidates', href: '/candidates', icon: Users2 },
      { key: 'services', href: '/services', icon: ShoppingBag, badgeKey: 'pendingServices' },
      { key: 'jobs', href: '/jobs', icon: Briefcase },
      // Report BS-66: privacy-request removal of applications (logged).
      { key: 'applications', href: '/applications', icon: FileText },
      // Growth-guide landing page leads.
      { key: 'leads', href: '/leads', icon: Download },
      { key: 'employer_plans', href: '/employer-plans', icon: CreditCard },
      { key: 'community', href: '/community', icon: Users },
      { key: 'community_categories', href: '/community-categories', icon: Tags },
      { key: 'reports', href: '/reports', icon: Flag },
    ],
  },
  {
    key: 'platform',
    items: [
      { key: 'payments', href: '/payments', icon: CreditCard },
      { key: 'discounts', href: '/discounts', icon: Tag },
      { key: 'analytics', href: '/analytics', icon: BarChart3 },
      { key: 'video_providers', href: '/video-providers', icon: Video },
      { key: 'video_analytics', href: '/video-analytics', icon: BarChart3 },
      { key: 'homepage', href: '/homepage', icon: Images },
      { key: 'articles', href: '/articles', icon: Newspaper },
      { key: 'marketing', href: '/marketing', icon: Megaphone },
      { key: 'settings', href: '/settings', icon: Settings },
      { key: 'portfolio_templates', href: '/portfolio-templates', icon: FileCode2 },
      { key: 'revenue_commission', href: '/revenue-commission', icon: CreditCard },
      { key: 'notifications', href: '/notifications', icon: Bell },
      { key: 'broadcast', href: '/broadcast', icon: Send },
    ],
  },
]

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((g) => g.items)
