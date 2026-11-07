import type { LucideIcon } from 'lucide-react'
import {
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Code2,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Palette,
  Play,
  Rocket,
  Star,
  TrendingUp,
  Video,
  Wallet,
} from 'lucide-react'

export type HeroSceneId =
  | 'learning'
  | 'skills'
  | 'job'
  | 'work'
  | 'freelance'
  | 'success'

export type CharacterVariant = HeroSceneId

export type LaptopContent =
  | 'video'
  | 'certificate'
  | 'job-card'
  | 'dashboard'
  | 'services'
  | 'growth'

export interface LocalizedCopy {
  en: string
  ar: string
}

export interface HeroScene {
  id: HeroSceneId
  title: LocalizedCopy
  subtitle: LocalizedCopy
  caption: LocalizedCopy
  timelineLabel: LocalizedCopy
  durationMs: number
  accentColor: string
  backgroundTint: string
  characterVariant: CharacterVariant
  laptopContent: LaptopContent
  floatingIcons: LucideIcon[]
  ctaHint?: LocalizedCopy
}

export const HERO_SCENE_ORDER: HeroSceneId[] = [
  'learning',
  'skills',
  'job',
  'work',
  'freelance',
  'success',
]

export const HERO_SCENES: HeroScene[] = [
  {
    id: 'learning',
    title: { en: 'Learning', ar: 'التعلّم' },
    subtitle: { en: 'Start your journey', ar: 'ابدأ رحلتك' },
    caption: { en: 'Learning new skills', ar: 'يتعلم مهارات جديدة' },
    timelineLabel: { en: 'Learn', ar: 'تعلم' },
    durationMs: 4000,
    accentColor: '#F97316',
    backgroundTint: 'rgba(249,115,22,0.08)',
    characterVariant: 'learning',
    laptopContent: 'video',
    floatingIcons: [Video, BookOpen, GraduationCap, Play],
  },
  {
    id: 'skills',
    title: { en: 'Skills', ar: 'المهارات' },
    subtitle: { en: 'Build confidence', ar: 'ابنِ ثقتك' },
    caption: { en: 'Building confidence', ar: 'يبني ثقته وخبرته' },
    timelineLabel: { en: 'Build Skills', ar: 'طوّر مهاراتك' },
    durationMs: 4000,
    accentColor: '#22C55E',
    backgroundTint: 'rgba(34,197,94,0.08)',
    characterVariant: 'skills',
    laptopContent: 'certificate',
    floatingIcons: [Award, Code2, Palette, ListChecks],
  },
  {
    id: 'job',
    title: { en: 'Opportunity', ar: 'الفرصة' },
    subtitle: { en: 'Land your role', ar: 'احصل على دورك' },
    caption: { en: 'Finding real opportunities', ar: 'يحصل على فرص حقيقية' },
    timelineLabel: { en: 'Find Work', ar: 'احصل على فرصة' },
    durationMs: 4000,
    accentColor: '#3B82F6',
    backgroundTint: 'rgba(59,130,246,0.08)',
    characterVariant: 'job',
    laptopContent: 'job-card',
    floatingIcons: [Briefcase, CheckCircle2, Star],
  },
  {
    id: 'work',
    title: { en: 'Professional', ar: 'الاحتراف' },
    subtitle: { en: 'Excel at work', ar: 'تميّز في عملك' },
    caption: { en: 'Growing at work', ar: 'ينمو في عمله' },
    timelineLabel: { en: 'Grow at Work', ar: 'انمُ في عملك' },
    durationMs: 4000,
    accentColor: '#6366F1',
    backgroundTint: 'rgba(99,102,241,0.08)',
    characterVariant: 'work',
    laptopContent: 'dashboard',
    floatingIcons: [LayoutDashboard, BarChart3, TrendingUp, ListChecks],
  },
  {
    id: 'freelance',
    title: { en: 'Services', ar: 'الخدمات' },
    subtitle: { en: 'Offer your expertise', ar: 'اعرض خبرتك' },
    caption: { en: 'Offering services', ar: 'يعرض خدماته' },
    timelineLabel: { en: 'Offer Services', ar: 'اعرض خدماتك' },
    durationMs: 4000,
    accentColor: '#8B5CF6',
    backgroundTint: 'rgba(139,92,246,0.08)',
    characterVariant: 'freelance',
    laptopContent: 'services',
    floatingIcons: [Palette, Code2, Star, Wallet],
  },
  {
    id: 'success',
    title: { en: 'Success', ar: 'النجاح' },
    subtitle: { en: 'Advance your future', ar: 'طوّر مستقبلك' },
    caption: { en: 'Advancing your future', ar: 'يطور مستقبله' },
    timelineLabel: { en: 'Advance', ar: 'انطلق' },
    durationMs: 4500,
    accentColor: '#F97316',
    backgroundTint: 'rgba(249,115,22,0.1)',
    characterVariant: 'success',
    laptopContent: 'growth',
    floatingIcons: [Rocket, TrendingUp, Award, Wallet],
    ctaHint: {
      en: 'Your journey starts here',
      ar: 'رحلتك تبدأ من هنا',
    },
  },
]

export function getSceneById(id: HeroSceneId): HeroScene {
  return HERO_SCENES.find((s) => s.id === id) ?? HERO_SCENES[0]
}

export function getSceneIndex(id: HeroSceneId): number {
  return HERO_SCENE_ORDER.indexOf(id)
}

export function pickLocalized(copy: LocalizedCopy, locale: string): string {
  return locale === 'ar' ? copy.ar : copy.en
}
