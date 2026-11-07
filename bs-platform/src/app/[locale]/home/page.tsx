import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getPlatformHomePath } from '@/lib/auth/personalized-home'

/** Legacy URL — public home is the landing page at `/`. */
export default async function LegacyHomeRedirect() {
  const locale = await getLocale()
  redirect(getPlatformHomePath(locale))
}
