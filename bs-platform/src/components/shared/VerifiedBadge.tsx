import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Small "verified" checkmark shown next to a verified user's name.
 * Purely presentational — the source of truth is `users.is_verified` (admin-set).
 */
export default function VerifiedBadge({
  className,
  label,
}: {
  className?: string
  label?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center text-primary', className)}
      title={label ?? 'Verified'}
      aria-label={label ?? 'Verified'}
    >
      <BadgeCheck className="h-4 w-4" />
    </span>
  )
}
