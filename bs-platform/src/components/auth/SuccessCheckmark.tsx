'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuccessCheckmarkProps {
  size?: 'md' | 'lg'
  className?: string
}

export default function SuccessCheckmark({ size = 'lg', className }: SuccessCheckmarkProps) {
  const isLarge = size === 'lg'

  return (
    <div
      className={cn(
        'mx-auto flex animate-[authCheckIn_0.4s_ease-out] items-center justify-center rounded-full bg-[#DCFCE7]',
        isLarge ? 'h-16 w-16' : 'h-12 w-12',
        className
      )}
    >
      <Check
        className={cn('text-[#22C55E]', isLarge ? 'h-8 w-8' : 'h-6 w-6')}
        strokeWidth={2.5}
        aria-hidden
      />
    </div>
  )
}
