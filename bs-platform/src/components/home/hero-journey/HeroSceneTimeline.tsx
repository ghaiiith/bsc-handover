'use client'

import { HERO_SCENE_ORDER, pickLocalized, type HeroScene, type HeroSceneId } from '@/components/home/hero-journey/hero-scenes'
import { cn } from '@/lib/utils'

interface HeroSceneTimelineProps {
  scenes: HeroScene[]
  activeSceneId: HeroSceneId
  locale: string
  dir: 'ltr' | 'rtl'
  onSelect: (id: HeroSceneId) => void
  compact?: boolean
}

export default function HeroSceneTimeline({
  scenes,
  activeSceneId,
  locale,
  dir,
  onSelect,
  compact = false,
}: HeroSceneTimelineProps) {
  const ordered = HERO_SCENE_ORDER.map((id) => scenes.find((s) => s.id === id)).filter(
    (s): s is HeroScene => Boolean(s)
  )
  const activeIndex = ordered.findIndex((s) => s.id === activeSceneId)

  return (
    <nav
      aria-label={locale === 'ar' ? 'مراحل الرحلة' : 'Journey timeline'}
      className={cn('w-full', dir === 'rtl' && 'direction-rtl')}
      dir={dir}
    >
      <div
        className={cn(
          'flex items-center gap-1',
          compact ? 'overflow-x-auto pb-1 scrollbar-none' : 'justify-between'
        )}
      >
        {ordered.map((scene, index) => {
          const isActive = scene.id === activeSceneId
          const isPast = index < activeIndex
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSelect(scene.id)}
              className={cn(
                'group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isActive && 'bg-primary/5'
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all md:size-7 md:text-xs',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30'
                    : isPast
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </span>
              {!compact && (
                <span
                  className={cn(
                    'hidden max-w-full truncate text-center text-[10px] font-medium leading-tight sm:block md:text-xs',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {pickLocalized(scene.timelineLabel, locale)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="relative mt-2 hidden h-0.5 overflow-hidden rounded-full bg-muted sm:block">
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-primary transition-all duration-500"
          style={{
            width: `${((activeIndex + 1) / ordered.length) * 100}%`,
          }}
        />
      </div>
    </nav>
  )
}
