import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import AppNavbar from '@/components/shared/AppNavbar'
import CvEditorClient from '@/components/cv/CvEditorClient'
import { getSessionProfile } from '@/lib/auth/profile'
import { getUserForCvImport } from '@/lib/cv/cv-data'
import {
  createEmptyFormData,
  profileToResumeInput,
  resumeInputToFormData,
} from '@/lib/cv/mappers'

interface PageProps {
  searchParams: Promise<{ source?: string }>
}

export default async function CvBuilderNewPage({ searchParams }: PageProps) {
  const locale = await getLocale()
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const { source } = await searchParams
  const language = locale === 'ar' ? 'ar' : 'en'

  let initialForm = createEmptyFormData(language)
  let loadedFromProfile = false

  if (source === 'profile') {
    const user = await getUserForCvImport(session.authUser.id)
    if (user) {
      const resume = profileToResumeInput(user)
      initialForm = resumeInputToFormData(resume, { language })
      loadedFromProfile = true
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNavbar />
      <CvEditorClient
        locale={locale}
        initialForm={initialForm}
        loadedFromProfile={loadedFromProfile}
        source={source}
      />
    </div>
  )
}
