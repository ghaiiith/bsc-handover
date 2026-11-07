'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { BookOpen } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavbarMyLearningLinkProps {
  isLoggedIn: boolean
}

export default function NavbarMyLearningLink({ isLoggedIn }: NavbarMyLearningLinkProps) {
  const t = useTranslations('nav')
  const locale = useLocale()

  if (!isLoggedIn) return null

  return (
    <Link
      href={`/${locale}/dashboard/my-learning`}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        'hidden gap-1.5 sm:inline-flex text-muted-foreground hover:text-foreground'
      )}
    >
      <BookOpen className="size-4" />
      <span className="text-xs font-medium">{t('my_learning')}</span>
    </Link>
  )
}
