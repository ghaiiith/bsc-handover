'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  ClipboardList,
  FileText,
  GraduationCap,
  Heart,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Shield,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import type { DashboardNavIconKey } from '@/lib/dashboard/nav-icon-keys'

export const DASHBOARD_NAV_ICONS: Record<DashboardNavIconKey, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'book-open': BookOpen,
  award: Award,
  heart: Heart,
  sparkles: Sparkles,
  bell: Bell,
  user: User,
  'file-text': FileText,
  briefcase: Briefcase,
  users: Users,
  'graduation-cap': GraduationCap,
  wallet: Wallet,
  inbox: Inbox,
  'shopping-bag': ShoppingBag,
  wrench: Wrench,
  store: Store,
  shield: Shield,
  'clipboard-list': ClipboardList,
  settings: Settings,
  'message-square': MessageSquare,
}

export function getDashboardNavIcon(key: DashboardNavIconKey): LucideIcon {
  return DASHBOARD_NAV_ICONS[key]
}
