import type { UserRole } from '@/types'

export type PortfolioVariant = 'student' | 'instructor'

export function resolvePortfolioVariant(role: UserRole): PortfolioVariant {
  return role === 'instructor' || role === 'admin' ? 'instructor' : 'student'
}

export interface PortfolioTheme {
  variant: PortfolioVariant
  accent: string
  accentMuted: string
  accentHover: string
  secondary: string
  ringGradient: string
  heroGlow: string
  cardBorder: string
  cardBg: string
  cardHover: string
  orbPrimary: string
  orbSecondary: string
  meshGradient: string
  pillHover: string
  timelineDot: string
  badgeClass: string
}

export const portfolioThemes: Record<PortfolioVariant, PortfolioTheme> = {
  student: {
    variant: 'student',
    accent: '#22C55E',
    accentMuted: '#22C55E20',
    accentHover: '#4ADE80',
    secondary: '#38BDF8',
    ringGradient: 'from-emerald-400 via-teal-400 to-cyan-400',
    heroGlow: 'shadow-[0_0_80px_-12px_rgba(34,197,94,0.55)]',
    cardBorder: 'border-emerald-500/20',
    cardBg: 'bg-white/[0.03] backdrop-blur-md',
    cardHover: 'hover:border-emerald-400/40 hover:shadow-[0_8px_32px_-8px_rgba(34,197,94,0.35)]',
    orbPrimary: 'bg-emerald-500/25',
    orbSecondary: 'bg-cyan-500/20',
    meshGradient:
      'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34,197,94,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(56,189,248,0.12), transparent)',
    pillHover: 'hover:border-emerald-400/50 hover:bg-emerald-500/10',
    timelineDot: 'bg-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.6)]',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  instructor: {
    variant: 'instructor',
    accent: '#F97316',
    accentMuted: '#F9731620',
    accentHover: '#FB923C',
    secondary: '#FBBF24',
    ringGradient: 'from-orange-400 via-amber-400 to-yellow-400',
    heroGlow: 'shadow-[0_0_80px_-12px_rgba(249,115,22,0.55)]',
    cardBorder: 'border-orange-500/20',
    cardBg: 'bg-white/[0.03] backdrop-blur-md',
    cardHover: 'hover:border-orange-400/40 hover:shadow-[0_8px_32px_-8px_rgba(249,115,22,0.35)]',
    orbPrimary: 'bg-orange-500/30',
    orbSecondary: 'bg-amber-500/20',
    meshGradient:
      'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249,115,22,0.22), transparent), radial-gradient(ellipse 60% 40% at 0% 20%, rgba(251,191,36,0.14), transparent)',
    pillHover: 'hover:border-orange-400/50 hover:bg-orange-500/10',
    timelineDot: 'bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.6)]',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
}
