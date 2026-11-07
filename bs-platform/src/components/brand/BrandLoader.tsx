'use client'

import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import BrandIcon from '@/components/brand/BrandIcon'

interface BrandLoaderProps {
  size?: number
  className?: string
  label?: string
}

function BrandLoaderComponent({
  size = 32,
  className,
  label,
}: BrandLoaderProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div className={cn('inline-flex items-center justify-center', className)} role="status">
        <BrandIcon size={size} variant="color" />
        {label ? <span className="sr-only">{label}</span> : null}
      </div>
    )
  }

  return (
    <div className={cn('inline-flex items-center justify-center', className)} role="status">
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BrandIcon size={size} variant="color" />
      </motion.div>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  )
}

export default memo(BrandLoaderComponent)
