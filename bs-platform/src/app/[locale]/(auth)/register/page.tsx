import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import RegisterForm from '@/components/auth/RegisterForm'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return {
    title: t('register_seo_title'),
    robots: { index: false, follow: false },
  }
}

export default function RegisterPage() {
  return <RegisterForm />
}
