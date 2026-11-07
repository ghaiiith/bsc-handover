'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Heart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleWishlist } from '@/lib/courses/wishlist-actions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CourseWishlistButtonProps {
  courseId: string
  locale: string
  initialWishlisted?: boolean
  variant?: 'default' | 'icon'
  className?: string
}

export default function CourseWishlistButton({
  courseId,
  locale,
  initialWishlisted = false,
  variant = 'default',
  className,
}: CourseWishlistButtonProps) {
  const t = useTranslations('courses')
  const router = useRouter()
  const [wished, setWished] = useState(initialWishlisted)
  const [pending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleWishlist(courseId, locale)
      if (result.error === 'not_authenticated') {
        router.push(`/${locale}/login`)
        return
      }
      if (!result.success) {
        toast.error(t('wishlist_error'))
        return
      }
      setWished(result.wished)
      toast.success(result.wished ? t('wishlist_added') : t('wishlist_removed'))
      router.refresh()
    })
  }

  if (variant === 'icon') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleToggle}
        disabled={pending}
        className={cn('relative', className)}
        aria-label={wished ? t('wishlist_remove') : t('wishlist_add')}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Heart className={cn('size-4', wished && 'fill-primary text-primary')} />
        )}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleToggle}
      disabled={pending}
      className={cn('gap-2', className)}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Heart className={cn('size-4', wished && 'fill-primary text-primary')} />
      )}
      {wished ? t('wishlist_remove') : t('wishlist_add')}
    </Button>
  )
}
