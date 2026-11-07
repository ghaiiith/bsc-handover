'use client'

import { memo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BRAND_FULL_NAME, BRAND_LOGO_SVG_PATH } from '@/lib/brand/constants'

export interface BrandIconProps {
  size?: number
  className?: string
  /** Subtle entrance / hover animation */
  animated?: boolean
  /** color = full traced mark; mono = desaturated for loading/disabled */
  variant?: 'color' | 'mono'
  title?: string
}

function BrandIconImage({
  size,
  className,
  variant,
  title,
}: Required<Pick<BrandIconProps, 'size' | 'variant'>> &
  Pick<BrandIconProps, 'className' | 'title'>) {
  const label = title ?? BRAND_FULL_NAME

  return (
    <Image
      src={BRAND_LOGO_SVG_PATH}
      alt={label}
      width={size}
      height={size}
      unoptimized
      priority={size >= 48}
      className={cn(
        'shrink-0 object-contain',
        variant === 'mono' && 'opacity-60 grayscale',
        className
      )}
      role="img"
      aria-label={label}
    />
  )
}

function BrandIconComponent({
  size = 40,
  className,
  animated = false,
  variant = 'color',
  title,
}: BrandIconProps) {
  if (!animated) {
    return (
      <BrandIconImage
        size={size}
        className={className}
        variant={variant}
        title={title}
      />
    )
  }

  return (
    <motion.span
      className={cn('inline-flex shrink-0', className)}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <BrandIconImage size={size} variant={variant} title={title} />
    </motion.span>
  )
}

export default memo(BrandIconComponent)
