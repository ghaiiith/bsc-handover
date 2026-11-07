import { getTranslations } from 'next-intl/server'
import { Quote } from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const STORY_KEYS = ['student', 'instructor', 'employer'] as const

export default async function SuccessStoriesSection() {
  const t = await getTranslations('landing.stories')

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <div className="grid gap-6 md:grid-cols-3">
          {STORY_KEYS.map((key, index) => (
            <article
              key={key}
              className={cn(
                'edu-card relative flex flex-col p-8',
                index === 1 && 'md:-translate-y-2'
              )}
            >
              <Quote className="h-8 w-8 text-primary/30" />
              <p className="mt-4 flex-1 leading-relaxed text-muted-foreground">
                &ldquo;{t(`${key}.quote`)}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t pt-6">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {t(`${key}.initials`)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{t(`${key}.name`)}</p>
                  <p className="text-sm text-muted-foreground">{t(`${key}.role`)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
