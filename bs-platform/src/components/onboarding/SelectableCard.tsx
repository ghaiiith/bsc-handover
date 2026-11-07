'use client'

import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectableCardProps {
  selected: boolean
  onSelect: () => void
  title: string
  description?: string
  icon?: ReactNode
  className?: string
}

export default function SelectableCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  className,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-start transition-all',
        'min-h-[72px] touch-manipulation',
        selected
          ? 'border-[#E57D17] bg-[#FFF1E6] shadow-sm dark:border-[#E57D17] dark:bg-[#E57D17]/10'
          : 'border-border bg-card hover:border-[#E57D17]/40',
        className
      )}
    >
      {icon ? (
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            selected ? 'bg-[#E57D17] text-white' : 'bg-muted text-muted-foreground'
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}

/**
 * Multi-select variant (report BS-26). It renders an explicit checkbox so it is
 * visually distinguishable from the single-choice cards — previously it looked
 * identical, which is why users believed only one option could be picked.
 */
export function MultiSelectCard({
  selected,
  onToggle,
  title,
  icon,
  disabled = false,
}: {
  selected: boolean
  onToggle: () => void
  title: string
  icon?: ReactNode
  /** True when the max has been reached and this item is not already selected. */
  disabled?: boolean
}) {
  const blocked = disabled && !selected

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={blocked}
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-start transition-all',
        'min-h-[56px] touch-manipulation',
        selected
          ? 'border-[#E57D17] bg-[#FFF1E6] shadow-sm dark:border-[#E57D17] dark:bg-[#E57D17]/10'
          : 'border-border bg-card hover:border-[#E57D17]/40',
        blocked && 'cursor-not-allowed opacity-50 hover:border-border'
      )}
    >
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          selected
            ? 'border-[#E57D17] bg-[#E57D17] text-white'
            : 'border-muted-foreground/40 bg-transparent'
        )}
      >
        {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>

      {icon ? (
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            selected ? 'bg-[#E57D17] text-white' : 'bg-muted text-muted-foreground'
          )}
        >
          {icon}
        </span>
      ) : null}

      <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{title}</span>
    </button>
  )
}
