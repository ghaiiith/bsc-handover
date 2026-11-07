import { cn } from '@/lib/utils'
import BrandIcon from '@/components/brand/BrandIcon'

interface AuthLogoMarkProps {
  size?: number
  className?: string
  variant?: 'light' | 'dark'
}

export default function AuthLogoMark({
  size = 32,
  className,
  variant = 'dark',
}: AuthLogoMarkProps) {
  const iconSize = Math.round(size * 0.72)
  const isLight = variant === 'light'

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-xl',
        isLight ? 'bg-brand-orange-soft' : 'bg-white/10',
        className
      )}
      style={{ width: size, height: size }}
    >
      <BrandIcon size={iconSize} title="Business Skills" />
    </div>
  )
}
