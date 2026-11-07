'use client'

import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { HeroSceneId } from '@/components/home/hero-journey/hero-scenes'
import { cn } from '@/lib/utils'

interface HeroFloatingIconsProps {
  icons: LucideIcon[]
  sceneId: HeroSceneId
  accentColor: string
  reducedMotion?: boolean
  compact?: boolean
}

const POSITIONS = [
  'top-[8%] start-[6%]',
  'top-[12%] end-[8%]',
  'top-[42%] end-[4%]',
  'bottom-[28%] start-[4%]',
  'bottom-[18%] end-[12%]',
]

function HeroFloatingIcons({
  icons,
  sceneId,
  accentColor,
  reducedMotion = false,
  compact = false,
}: HeroFloatingIconsProps) {
  const visible = icons.slice(0, compact ? 3 : 4)

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <AnimatePresence mode="wait">
        <motion.div
          key={sceneId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          {visible.map((Icon, index) => (
            <motion.div
              key={`${sceneId}-${index}`}
              className={cn(
                'absolute flex size-9 items-center justify-center rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm md:size-10',
                POSITIONS[index % POSITIONS.length]
              )}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.8, y: 8 }}
              animate={
                reducedMotion
                  ? { opacity: 0.9, scale: 1, y: 0 }
                  : {
                      opacity: [0.85, 1, 0.85],
                      y: [0, -6, 0],
                      rotate: [0, index % 2 === 0 ? 3 : -3, 0],
                    }
              }
              transition={{
                opacity: { duration: 3, repeat: Infinity, delay: index * 0.2 },
                y: { duration: 3.5, repeat: Infinity, delay: index * 0.25 },
                rotate: { duration: 4, repeat: Infinity },
                default: { duration: 0.4, delay: index * 0.1 },
              }}
            >
              <Icon className="size-4 md:size-[18px]" style={{ color: accentColor }} strokeWidth={1.75} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default memo(HeroFloatingIcons)
