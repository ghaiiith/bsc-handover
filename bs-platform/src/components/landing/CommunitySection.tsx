import { getTranslations } from 'next-intl/server'
import { Calendar, MessageSquare, Users, Network } from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'

const ITEMS = [
  { key: 'discussions' as const, icon: MessageSquare },
  { key: 'groups' as const, icon: Users },
  { key: 'events' as const, icon: Calendar },
  { key: 'networking' as const, icon: Network },
]

export default async function CommunitySection() {
  const t = await getTranslations('landing.community')

  return (
    <section id="community" className="bg-muted/20 py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.key} className="edu-card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{t(`${item.key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`${item.key}.desc`)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
