'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import type { CharacterVariant } from '@/components/home/hero-journey/hero-scenes'

interface HeroCharacterProps {
  variant: CharacterVariant
  accentColor: string
  reducedMotion?: boolean
}

const VARIANT_STYLES: Record<
  CharacterVariant,
  { topColor: string; bottomColor: string; y: number; scale: number }
> = {
  learning: { topColor: '#F97316', bottomColor: '#1E293B', y: 0, scale: 1 },
  skills: { topColor: '#22C55E', bottomColor: '#334155', y: -4, scale: 1.02 },
  job: { topColor: '#F97316', bottomColor: '#1E293B', y: 0, scale: 1 },
  work: { topColor: '#3B82F6', bottomColor: '#1E3A5F', y: -2, scale: 1 },
  freelance: { topColor: '#8B5CF6', bottomColor: '#4C1D95', y: -8, scale: 1.03 },
  success: { topColor: '#F97316', bottomColor: '#1E293B', y: -6, scale: 1.05 },
}

function HeroCharacter({ variant, accentColor, reducedMotion = false }: HeroCharacterProps) {
  const style = VARIANT_STYLES[variant]
  const breathe = reducedMotion
    ? {}
    : {
        y: [style.y, style.y - 2, style.y],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
      }

  return (
    <motion.g
      transform="translate(52, 72)"
      animate={breathe}
      style={{ transformOrigin: '40px 80px' }}
    >
      {/* Chair back */}
      <path
        d="M8 68 Q8 42 28 38 L48 38 Q68 42 68 68"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-foreground/50"
      />

      {/* Body / hoodie or jacket */}
      <path
        d="M22 52 Q40 48 58 52 L62 88 Q40 94 18 88 Z"
        fill={style.topColor}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="text-foreground/70"
      />

      {/* Arms */}
      <motion.path
        d="M22 58 L8 72"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-foreground/80"
        animate={
          reducedMotion
            ? {}
            : variant === 'learning'
              ? { rotate: [0, -4, 0] }
              : variant === 'work'
                ? { y: [0, -1, 0] }
                : {}
        }
        style={{ transformOrigin: '22px 58px' }}
      />
      <motion.path
        d="M58 58 L72 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-foreground/80"
        animate={
          reducedMotion
            ? {}
            : { rotate: variant === 'learning' ? [0, 6, 0] : [0, -3, 0] }
        }
        style={{ transformOrigin: '58px 58px' }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />

      {/* Head */}
      <circle
        cx="40"
        cy="32"
        r="14"
        fill="#FDBA74"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-foreground/70"
      />

      {/* Hair */}
      <path
        d="M26 30 Q40 14 54 30 Q52 22 40 20 Q28 22 26 30"
        fill="currentColor"
        className="text-foreground/85"
      />

      {/* Face */}
      <circle cx="35" cy="32" r="1.2" fill="currentColor" className="text-foreground/80" />
      <circle cx="45" cy="32" r="1.2" fill="currentColor" className="text-foreground/80" />
      <path
        d="M36 38 Q40 41 44 38"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        className="text-foreground/60"
      />

      {/* Glasses for work variant */}
      {variant === 'work' && (
        <g stroke="currentColor" strokeWidth="1.2" fill="none" className="text-foreground/70">
          <circle cx="35" cy="32" r="4" />
          <circle cx="45" cy="32" r="4" />
          <path d="M39 32 L41 32" />
        </g>
      )}

      {/* Backpack for skills */}
      {variant === 'skills' && (
        <rect
          x="62"
          y="48"
          width="12"
          height="22"
          rx="3"
          fill="#22C55E"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/50"
        />
      )}

      {/* Rocket for success */}
      {variant === 'success' && (
        <motion.g
          transform="translate(78, 20)"
          animate={reducedMotion ? {} : { y: [0, -6, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <path
            d="M8 0 L12 16 L8 14 L4 16 Z"
            fill={accentColor}
            stroke="currentColor"
            strokeWidth="0.8"
            className="text-foreground/50"
          />
          <motion.circle
            cx="8"
            cy="18"
            r="3"
            fill="#F97316"
            opacity={0.4}
            animate={reducedMotion ? {} : { opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.g>
      )}

      {/* Notebook for learning */}
      {(variant === 'learning' || variant === 'job') && (
        <rect
          x="68"
          y="74"
          width="14"
          height="18"
          rx="1"
          fill="#FEF3C7"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/40"
        />
      )}
    </motion.g>
  )
}

export default memo(HeroCharacter)
