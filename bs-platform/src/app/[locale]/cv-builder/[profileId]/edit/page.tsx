import { Suspense } from 'react'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import AppNavbar from '@/components/shared/AppNavbar'
import CvEditorClient from '@/components/cv/CvEditorClient'
import { getSessionProfile } from '@/lib/auth/profile'
import { getCvProfile } from '@/lib/cv/cv-data'
import { cvProfileToFormData } from '@/lib/cv/mappers'

interface PageProps {
  params: Promise<{ profileId: string }>
}

export default async function CvBuilderEditPage({ params }: PageProps) {
  const locale = await getLocale()
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const { profileId } = await params
  const profile = await getCvProfile(profileId, session.authUser.id)
  if (!profile) notFound()

  const initialForm = cvProfileToFormData(profile)

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNavbar />
      <Suspense fallback={null}>
        <CvEditorClient
          locale={locale}
          profileId={profile.id}
          initialForm={initialForm}
        />
      </Suspense>
    </div>
  )
}
