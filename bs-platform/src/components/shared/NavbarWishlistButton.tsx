'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Heart } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { getBrowserAuthUser } from '@/lib/supabase/safe-browser-auth'
import { cn } from '@/lib/utils'

export default function NavbarWishlistButton() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void getBrowserAuthUser().then(async (user) => {
      if (!user) return
      setVisible(true)
      const { count: wishCount } = await supabase
        .from('course_wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setCount(wishCount ?? 0)
    })
  }, [])

  if (!visible) return null

  return (
    <Link
      href={`/${locale}/dashboard/wishlist`}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'relative')}
      aria-label={t('wishlist')}
    >
        <Heart className="size-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {count > 9 ? '9+' : count}
          </span>
        )}
    </Link>
  )
}
