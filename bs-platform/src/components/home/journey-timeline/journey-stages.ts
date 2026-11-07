import type { LucideIcon } from 'lucide-react'
import {
  Award,
  BookOpen,
  Briefcase,
  GraduationCap,
  Rocket,
  Wrench,
} from 'lucide-react'

export type JourneyStageId =
  | 'learn'
  | 'skills'
  | 'certified'
  | 'work'
  | 'services'
  | 'advance'

export type JourneyCardType =
  | 'course'
  | 'skills'
  | 'certificate'
  | 'job'
  | 'service'
  | 'growth'

export interface JourneyStage {
  id: JourneyStageId
  order: number
  labelEn: string
  labelAr: string
  titleEn: string
  titleAr: string
  descriptionEn: string
  descriptionAr: string
  icon: LucideIcon
  accentColor: string
  durationMs: number
  cardType: JourneyCardType
}

export const JOURNEY_STAGE_ORDER: JourneyStageId[] = [
  'learn',
  'skills',
  'certified',
  'work',
  'services',
  'advance',
]

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: 'learn',
    order: 1,
    labelEn: 'Learn',
    labelAr: 'تعلم',
    titleEn: 'Learn from expert courses',
    titleAr: 'تعلم من دورات احترافية',
    descriptionEn: 'Start learning from expert courses.',
    descriptionAr: 'ابدأ التعلم من دورات احترافية.',
    icon: BookOpen,
    accentColor: '#F97316',
    durationMs: 3800,
    cardType: 'course',
  },
  {
    id: 'skills',
    order: 2,
    labelEn: 'Build Skills',
    labelAr: 'طوّر مهاراتك',
    titleEn: 'Build practical skills',
    titleAr: 'طوّر مهارات عملية',
    descriptionEn: 'Build practical skills step by step.',
    descriptionAr: 'طوّر مهاراتك خطوة بخطوة.',
    icon: GraduationCap,
    accentColor: '#3B82F6',
    durationMs: 3800,
    cardType: 'skills',
  },
  {
    id: 'certified',
    order: 3,
    labelEn: 'Get Certified',
    labelAr: 'احصل على شهادة',
    titleEn: 'Earn verified certificates',
    titleAr: 'احصل على شهادات موثوقة',
    descriptionEn: 'Earn certificates that prove your progress.',
    descriptionAr: 'احصل على شهادات تثبت تقدمك.',
    icon: Award,
    accentColor: '#8B5CF6',
    durationMs: 3800,
    cardType: 'certificate',
  },
  {
    id: 'work',
    order: 4,
    labelEn: 'Find Work',
    labelAr: 'احصل على فرصة',
    titleEn: 'Find real opportunities',
    titleAr: 'اكتشف فرص عمل حقيقية',
    descriptionEn: 'Find real job opportunities.',
    descriptionAr: 'احصل على فرص عمل حقيقية.',
    icon: Briefcase,
    accentColor: '#22C55E',
    durationMs: 3800,
    cardType: 'job',
  },
  {
    id: 'services',
    order: 5,
    labelEn: 'Offer Services',
    labelAr: 'اعرض خدماتك',
    titleEn: 'Offer your services',
    titleAr: 'اعرض خدماتك',
    descriptionEn: 'Offer your services and reach clients.',
    descriptionAr: 'اعرض خدماتك ووصل إلى العملاء.',
    icon: Wrench,
    accentColor: '#6366F1',
    durationMs: 3800,
    cardType: 'service',
  },
  {
    id: 'advance',
    order: 6,
    labelEn: 'Advance',
    labelAr: 'انطلق',
    titleEn: 'Advance your career',
    titleAr: 'طوّر مسارك المهني',
    descriptionEn: 'Advance your career and grow your future.',
    descriptionAr: 'طوّر مسارك وحقق نموك المهني.',
    icon: Rocket,
    accentColor: '#F97316',
    durationMs: 4200,
    cardType: 'growth',
  },
]

export const JOURNEY_PREVIEW_HEIGHT_PX = 172
export const JOURNEY_CARD_HEIGHT_PX = 300

export function getJourneyStage(id: JourneyStageId): JourneyStage {
  return JOURNEY_STAGES.find((s) => s.id === id) ?? JOURNEY_STAGES[0]
}

export function getJourneyStageIndex(id: JourneyStageId): number {
  return JOURNEY_STAGE_ORDER.indexOf(id)
}

export function stageLabel(stage: JourneyStage, locale: string): string {
  return locale === 'ar' ? stage.labelAr : stage.labelEn
}

export function stageTitle(stage: JourneyStage, locale: string): string {
  return locale === 'ar' ? stage.titleAr : stage.titleEn
}

export function stageDescription(stage: JourneyStage, locale: string): string {
  return locale === 'ar' ? stage.descriptionAr : stage.descriptionEn
}
