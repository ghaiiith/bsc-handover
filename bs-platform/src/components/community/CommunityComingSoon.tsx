import { getTranslations } from 'next-intl/server'
import { Sparkles, Users } from 'lucide-react'

export default async function CommunityComingSoon() {
  const t = await getTranslations('community')

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 end-1/4 size-72 rounded-full bg-brand-green/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 start-1/4 size-64 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 shadow-sm">
          <Sparkles className="size-9 text-primary" />
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Users className="size-3.5" />
          🇮🇶 {t('badge')}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {t('coming_soon_title')}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          {t('coming_soon_subtitle')}
        </p>
      </div>
    </div>
  )
}
