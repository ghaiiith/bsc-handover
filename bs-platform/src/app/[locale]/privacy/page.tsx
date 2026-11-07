import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import LegalView from '@/components/legal/LegalView'
import { PRIVACY } from '@/lib/legal/content'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const doc = PRIVACY[locale === 'ar' ? 'ar' : 'en']
  return { title: doc.title }
}

export default async function PrivacyPage() {
  const locale = await getLocale()
  const doc = PRIVACY[locale === 'ar' ? 'ar' : 'en']
  return <LegalView doc={doc} />
}
