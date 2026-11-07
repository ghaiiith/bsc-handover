import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import { Loader2 } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return {
    title: t('login_seo_title'),
    robots: { index: false, follow: false },
  }
}

function LoginFallback() {
  return (
    <div className="flex w-full max-w-[440px] justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#F97316]" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
