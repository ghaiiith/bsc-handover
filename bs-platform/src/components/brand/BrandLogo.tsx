'use client'

import Link from 'next/link'
import { memo } from 'react'
import { useLocale } from 'next-intl'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BRAND_FULL_NAME, getBrandName } from '@/lib/brand/constants'
import BrandIcon from '@/components/brand/BrandIcon'

export type BrandLogoOrientation = 'horizontal' | 'stacked' | 'iconOnly'
export type BrandLogoMode = 'full' | 'compact'

export interface BrandLogoProps {
  locale?: string
  href?: string
  orientation?: BrandLogoOrientation
  mode?: BrandLogoMode
  className?: string
  iconSize?: number
  /** Subtle hover lift on the mark */
  interactive?: boolean
  /** Force a full document navigation (avoids stale client router state) */
  reloadOnNavigate?: boolean
  /** Force light text (dark backgrounds) */
  onDark?: boolean
}

function BrandLogoComponent({
  locale: localeProp,
  href,
  orientation = 'horizontal',
  mode = 'full',
  className,
  iconSize,
  interactive = false,
  reloadOnNavigate = false,
  onDark = false,
}: BrandLogoProps) {
  const contextLocale = useLocale()
  const locale = localeProp ?? contextLocale
  const isStacked = orientation === 'stacked'
  const isIconOnly = orientation === 'iconOnly'
  const reduceMotion = useReducedMotion()
  const label = getBrandName(mode, locale)
  const resolvedIconSize = iconSize ?? (isIconOnly ? 36 : isStacked ? 44 : 32)
  const textClass = onDark
    ? 'text-white'
    : 'text-foreground'

  const content = (
    <motion.span
      className={cn(
        'group inline-flex items-center',
        isStacked ? 'flex-col gap-2 text-center' : 'flex-row gap-2.5',
        interactive && 'transition-transform duration-300',
        className
      )}
      whileHover={interactive && !reduceMotion ? { y: -1 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      <span
        className={cn(
          interactive &&
            'transition-[filter,transform] duration-300 group-hover:drop-shadow-[0_4px_12px_rgba(229,125,23,0.25)]'
        )}
      >
        <BrandIcon size={resolvedIconSize} title={BRAND_FULL_NAME} />
      </span>
      {!isIconOnly && (
        <span
          className={cn(
            'font-bold leading-tight tracking-tight transition-opacity duration-300',
            mode === 'compact' ? 'text-sm sm:text-base' : 'text-base sm:text-lg',
            textClass,
            interactive && 'group-hover:opacity-90'
          )}
        >
          {label}
        </span>
      )}
    </motion.span>
  )

  const ariaLabel = BRAND_FULL_NAME

  if (href) {
    return (
      <Link
        href={href}
        prefetch={false}
        onClick={
          reloadOnNavigate
            ? (event) => {
                event.preventDefault()
                window.location.assign(href)
              }
            : undefined
        }
        className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    )
  }

  return (
    <span role="img" aria-label={ariaLabel}>
      {content}
    </span>
  )
}

export default memo(BrandLogoComponent)
