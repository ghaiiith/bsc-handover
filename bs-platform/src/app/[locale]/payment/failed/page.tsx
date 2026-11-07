import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { XCircle } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SUPPORT_EMAIL } from '@/lib/payment/config'

interface PaymentFailedPageProps {
  searchParams: Promise<{ reason?: string; courseId?: string }>
}

export default async function PaymentFailedPage({
  searchParams,
}: PaymentFailedPageProps) {
  const locale = await getLocale()
  const t = await getTranslations('payment')
  const { reason, courseId } = await searchParams

  const messageKey =
    reason === 'verification_failed'
      ? 'failed_verification'
      : reason === 'cancelled'
        ? 'failed_cancelled'
        : 'failed_default'

  const retryHref = courseId
    ? `/${locale}/courses/${courseId}`
    : `/${locale}/courses`

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-8">
        <XCircle className="mx-auto h-20 w-20 text-destructive animate-in zoom-in-50 duration-500" />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t('failed_title')}</h1>
          <p className="text-muted-foreground">{t(messageKey)}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={retryHref} className={cn(buttonVariants({ size: 'lg' }))}>
            {t('retry')}
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
          >
            {t('contact_support')}
          </a>
        </div>
      </div>
    </div>
  )
}
