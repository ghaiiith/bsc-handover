import { getTranslations } from 'next-intl/server'
import {
  Award,
  BarChart3,
  Briefcase,
  FileText,
  LayoutDashboard,
  Sparkles,
  Target,
} from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'

const FEATURES = [
  { key: 'resume' as const, icon: FileText },
  { key: 'tracking' as const, icon: Target },
  { key: 'matching' as const, icon: Briefcase },
  { key: 'certificates' as const, icon: Award },
  { key: 'instructor_dashboard' as const, icon: LayoutDashboard },
  { key: 'ats' as const, icon: Sparkles },
  { key: 'analytics' as const, icon: BarChart3 },
] as const

export default async function PlatformFeaturesSection() {
  const t = await getTranslations('landing.features')

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.key}
                className="edu-card group flex items-start gap-4 p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-brand-green/10 transition-colors group-hover:from-primary/25">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t(`${feature.key}.title`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {t(`${feature.key}.desc`)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
