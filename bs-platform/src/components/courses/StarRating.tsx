import { Star, StarHalf } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  showCount?: boolean
  count?: number
  size?: 'sm' | 'md'
  className?: string
}

export default function StarRating({
  rating,
  showCount = false,
  count = 0,
  size = 'sm',
  className,
}: StarRatingProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const stars = Array.from({ length: 5 }, (_, index) => {
    const starValue = index + 1
    if (rating >= starValue) return 'full'
    if (rating >= starValue - 0.5) return 'half'
    return 'empty'
  })

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {stars.map((type, index) => {
          if (type === 'half') {
            return (
              <StarHalf
                key={index}
                className={cn(iconSize, 'fill-amber-400 text-amber-400')}
              />
            )
          }
          return (
            <Star
              key={index}
              className={cn(
                iconSize,
                type === 'full'
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-muted text-muted'
              )}
            />
          )
        })}
      </div>
      {showCount && (
        <span className="text-xs text-muted-foreground">
          {rating > 0 ? rating.toFixed(1) : '0.0'}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </div>
  )
}
