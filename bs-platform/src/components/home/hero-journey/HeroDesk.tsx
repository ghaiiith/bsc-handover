'use client'

import { memo } from 'react'
import type { HeroScene } from '@/components/home/hero-journey/hero-scenes'
import HeroCharacter from '@/components/home/hero-journey/HeroCharacter'
import HeroLaptop from '@/components/home/hero-journey/HeroLaptop'

interface HeroDeskProps {
  scene: HeroScene
  reducedMotion?: boolean
}

function HeroDesk({ scene, reducedMotion = false }: HeroDeskProps) {
  const showBooks = scene.id === 'learning' || scene.id === 'skills'
  const showPlant = scene.id !== 'success'

  return (
    <svg
      viewBox="0 0 320 240"
      className="h-full w-full"
      aria-hidden
      role="presentation"
    >
      {/* Desk surface */}
      <path
        d="M24 168 L296 168 L288 178 L32 178 Z"
        fill="currentColor"
        className="text-amber-900/25 dark:text-amber-700/20"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M32 178 L32 200 M288 178 L288 200"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-foreground/40"
      />

      {/* Lamp */}
      <g transform="translate(248, 118)">
        <path d="M0 50 L0 30" stroke="currentColor" strokeWidth="2" className="text-foreground/50" />
        <path
          d="M-14 30 Q0 8 14 30 Z"
          fill="#FDE68A"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/40"
          opacity={0.9}
        />
      </g>

      {/* Plant */}
      {showPlant && (
        <g transform="translate(28, 142)">
          <rect x="0" y="14" width="14" height="12" rx="2" fill="#3B82F6" opacity={0.7} />
          <ellipse cx="7" cy="10" rx="10" ry="12" fill="#22C55E" opacity={0.8} />
        </g>
      )}

      {/* Books stack */}
      {showBooks && (
        <g transform="translate(210, 148)">
          <rect x="0" y="8" width="22" height="5" rx="1" fill="#F97316" opacity={0.8} />
          <rect x="2" y="2" width="20" height="5" rx="1" fill="#3B82F6" opacity={0.7} />
          <rect x="4" y="-4" width="18" height="5" rx="1" fill="#22C55E" opacity={0.7} />
        </g>
      )}

      {/* Coffee cup */}
      {scene.id === 'work' && (
        <g transform="translate(230, 152)">
          <path
            d="M0 10 L0 2 Q6 -2 12 2 L12 10 Z"
            fill="currentColor"
            className="text-foreground/20"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
      )}

      <HeroLaptop
        content={scene.laptopContent}
        accentColor={scene.accentColor}
        reducedMotion={reducedMotion}
      />

      <HeroCharacter
        variant={scene.characterVariant}
        accentColor={scene.accentColor}
        reducedMotion={reducedMotion}
      />
    </svg>
  )
}

export default memo(HeroDesk)
