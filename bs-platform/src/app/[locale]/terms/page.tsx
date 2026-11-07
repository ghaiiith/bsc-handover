import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import LegalView from '@/components/legal/LegalView'
import { TERMS } from '@/lib/legal/content'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const doc = TERMS[locale === 'ar' ? 'ar' : 'en']
  return { title: doc.title }
}

export default async function TermsPage() {
  const locale = await getLocale()
  const doc = TERMS[locale === 'ar' ? 'ar' : 'en']
  return <LegalView doc={doc} />
}
