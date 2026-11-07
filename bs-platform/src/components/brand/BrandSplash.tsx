'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  BRAND_FULL_NAME,
  BRAND_SPLASH_STORAGE_KEY,
} from '@/lib/brand/constants'
import BrandIcon from '@/components/brand/BrandIcon'

interface BrandSplashProps {
  onComplete?: () => void
}

export default function BrandSplash({ onComplete }: BrandSplashProps) {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const duration = reduceMotion ? 400 : 1600
    const timer = window.setTimeout(() => {
      setVisible(false)
      try {
        sessionStorage.setItem(BRAND_SPLASH_STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
      onComplete?.()
    }, duration)
    return () => window.clearTimeout(timer)
  }, [onComplete, reduceMotion])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[100] flex flex-col items-center justify-center',
            'bg-[#F4F5F7] dark:bg-[#0B1220]'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: 'easeOut' }}
          role="dialog"
          aria-label={BRAND_FULL_NAME}
          aria-busy="true"
        >
          <motion.div
            className="flex flex-col items-center gap-5"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              initial={reduceMotion ? false : { scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: reduceMotion ? 0.15 : 0.65,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <BrandIcon size={88} animated={!reduceMotion} />
            </motion.div>
            <motion.p
              className="text-lg font-semibold tracking-tight text-foreground dark:text-[#F9FAFB] sm:text-xl"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0.1 : 0.45, duration: 0.4 }}
            >
              {BRAND_FULL_NAME}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
