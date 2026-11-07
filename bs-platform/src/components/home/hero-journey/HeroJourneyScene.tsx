'use client'

import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HeroScene } from '@/components/home/hero-journey/hero-scenes'
import { pickLocalized } from '@/components/home/hero-journey/hero-scenes'
import HeroDesk from '@/components/home/hero-journey/HeroDesk'
import HeroFloatingIcons from '@/components/home/hero-journey/HeroFloatingIcons'
import HeroSketchBackground from '@/components/home/hero-journey/HeroSketchBackground'
import { cn } from '@/lib/utils'

interface HeroJourneySceneProps {
  scene: HeroScene
  locale: string
  reducedMotion?: boolean
}

function HeroJourneyScene({
  scene,
  locale,
  reducedMotion = false,
}: HeroJourneySceneProps) {
  return (
    <div className="relative h-full w-full">
      <HeroSketchBackground
        tint={scene.backgroundTint}
        accentColor={scene.accentColor}
        sceneKey={scene.id}
        reducedMotion={reducedMotion}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="relative h-[72%] w-full"
        >
          <HeroDesk scene={scene} reducedMotion={reducedMotion} />
          <HeroFloatingIcons
            icons={scene.floatingIcons}
            sceneId={scene.id}
            accentColor={scene.accentColor}
            reducedMotion={reducedMotion}
          />
        </motion.div>
      </AnimatePresence>

      <motion.p
        key={`caption-${scene.id}`}
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'absolute bottom-2 inset-x-0 text-center text-xs font-medium text-muted-foreground md:text-sm',
          locale === 'ar' && 'font-cairo'
        )}
      >
        {pickLocalized(scene.caption, locale)}
      </motion.p>
    </div>
  )
}

export default memo(HeroJourneyScene)
