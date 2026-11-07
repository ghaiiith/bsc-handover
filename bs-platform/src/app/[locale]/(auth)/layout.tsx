import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getDefaultWorkspacePath } from '@/lib/auth/personalized-home'
import { getSessionProfile } from '@/lib/auth/profile'
import { Suspense } from 'react'
import { NOINDEX_METADATA } from '@/lib/seo/metadata'
import AuthBrandingPanel from '@/components/auth/AuthBrandingPanel'
import AuthPageTransition from '@/components/auth/AuthPageTransition'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = NOINDEX_METADATA

function AuthLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="h-8 w-8 animate-spin text-[#F97316]" aria-label="Loading" />
    </div>
  )
}

async function AuthLayoutContent({
  children,
  locale,
}: {
  children: React.ReactNode
  locale: string
}) {
  // Only pay for the session lookup (a GoTrue round-trip) when the visitor
  // actually has auth cookies. The common case for /login and /register is a
  // logged-out visitor, who should get an instantly-interactive form (BS-05).
  const cookieStore = await cookies()
  const hasAuthCookies = cookieStore
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

  if (hasAuthCookies) {
    const session = await getSessionProfile()
    if (session) {
      redirect(getDefaultWorkspacePath(locale, session.profile.role))
    }
  }

  return (
    <div className="flex min-h-screen">
      <AuthBrandingPanel locale={locale} />
      <div className="flex min-h-screen w-full flex-1 items-center justify-center bg-[#F8FAFC] px-4 py-8 md:w-[40%]">
        <AuthPageTransition>{children}</AuthPageTransition>
      </div>
    </div>
  )
}

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <AuthLayoutContent locale={locale}>{children}</AuthLayoutContent>
    </Suspense>
  )
}
