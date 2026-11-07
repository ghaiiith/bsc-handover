'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Loader2, Save, Sparkles, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProfileCompletionBar from '@/components/profile/ProfileCompletionBar'
import CvBuilderBanner from '@/components/cv/CvBuilderBanner'
import CvUploadSection from '@/components/profile/CvUploadSection'
import JobAlertsSection from '@/components/profile/JobAlertsSection'
import ProfileBasicSection from '@/components/profile/ProfileBasicSection'
import ProfileBioSection from '@/components/profile/ProfileBioSection'
import ProfileSkillsSection from '@/components/profile/ProfileSkillsSection'
import ProfileExperienceSection from '@/components/profile/ProfileExperienceSection'
import ProfileEducationSection from '@/components/profile/ProfileEducationSection'
import ProfileProjectsSection from '@/components/profile/ProfileProjectsSection'
import ProfileLinksSection from '@/components/profile/ProfileLinksSection'
import PortfolioSettingsSection from '@/components/portfolio/PortfolioSettingsSection'
import CommunityStatusSection from '@/components/profile/CommunityStatusSection'
import ProfileCertificatesSection from '@/components/profile/ProfileCertificatesSection'
import ImportCvModal from '@/components/profile/ImportCvModal'
import { calculateProfileScore } from '@/lib/profile/profile-score'
import { meetsCommunityThreshold } from '@/lib/community/constants'
import { mergeCvIntoProfile } from '@/lib/profile/profile-merge'
import { sanitizeProfileForSave } from '@/lib/profile/profile-sanitize'
import type { CvExtractedProfile, ProfileFormState } from '@/types/profile'
import type { OnboardingPreferences } from '@/types/onboarding'
import type { User } from '@/types'
import { dispatchProfileUpdated } from '@/lib/auth/profile-events'
import { toast } from 'sonner'

interface ProfilePageClientProps {
  locale: string
  userId: string
  initialForm: ProfileFormState
  preferences?: OnboardingPreferences
  portfolioSlug?: string | null
  portfolioIsPublic?: boolean
  uploadedCvUrl?: string | null
  uploadedCvName?: string | null
  roleCategories?: import('@/components/profile/ProfileBasicSection').RoleCategoryOption[]
  certificates?: import('@/types/certificate').CertificateWithCourse[]
  canAccessAi?: boolean
}

function formsEqual(a: ProfileFormState, b: ProfileFormState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function ProfilePageClient({
  locale,
  userId,
  initialForm,
  preferences = {},
  portfolioSlug,
  portfolioIsPublic = true,
  uploadedCvUrl,
  uploadedCvName,
  roleCategories,
  certificates = [],
  canAccessAi = false,
}: ProfilePageClientProps) {
  const t = useTranslations('profile')
  const tPortfolio = useTranslations('portfolio')
  const router = useRouter()
  const [savedForm, setSavedForm] = useState(initialForm)
  const [form, setForm] = useState(initialForm)
  const [importOpen, setImportOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const isDirty = !formsEqual(form, savedForm)
  const score = useMemo(() => calculateProfileScore(form), [form])

  const patchForm = useCallback((patch: Partial<ProfileFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleSave = () => {
    startTransition(async () => {
      const payload = sanitizeProfileForSave(form)
      const res = await fetch('/api/profile/save', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as {
        form?: ProfileFormState
        user?: User
        error?: string
        details?: { fieldErrors?: Record<string, string[]> }
      }
      if (!res.ok) {
        if (data.error === 'validation_failed' && data.details?.fieldErrors) {
          const first = Object.values(data.details.fieldErrors).flat()[0]
          toast.error(first ?? t('save_error'))
        } else {
          toast.error(t('save_error'))
        }
        return
      }
      const next = data.form ?? form
      setForm(next)
      setSavedForm(next)
      if (data.user) {
        dispatchProfileUpdated(data.user)
      }
      router.refresh()
      setJustSaved(true)
      toast.success(t('saved'))
      setTimeout(() => setJustSaved(false), 3000)
    })
  }

  const handleImportApply = (extracted: CvExtractedProfile) => {
    setForm((prev) => mergeCvIntoProfile(prev, extracted))
  }

  return (
    <div className="relative pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
          <ProfileCompletionBar score={score} className="max-w-md pt-2" />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {portfolioSlug && portfolioIsPublic && (
            <Link
              href={`/${locale}/portfolio/${portfolioSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              {tPortfolio('view_my_portfolio')}
            </Link>
          )}
          {/* Primary brand (orange) — this is the main action on the page (BS-36). */}
          <Button
            type="button"
            className="gap-2"
            onClick={() => setImportOpen(true)}
          >
          <Upload className="h-4 w-4" />
          <Sparkles className="h-4 w-4" />
          {t('import_cv')}
        </Button>
        </div>
      </div>

      <CvBuilderBanner locale={locale} />

      <CvUploadSection initialUrl={uploadedCvUrl} initialName={uploadedCvName} />
      {/* Round 9 (BS-104): opt-in high-match alerts. */}
      <JobAlertsSection />

      <CommunityStatusSection
        profileScore={score}
        meetsCommunityBar={meetsCommunityThreshold(calculateProfileScore(form))}
        portfolioIsPublic={portfolioIsPublic}
        portfolioSlug={portfolioSlug}
      />

      <div className="space-y-6">
        <ProfileBasicSection locale={locale} form={form} userId={userId} onChange={patchForm} roleCategories={roleCategories} />
        <ProfileBioSection form={form} onChange={patchForm} />
        <ProfileSkillsSection form={form} onChange={patchForm} canAccessAi={canAccessAi} />
        <ProfileExperienceSection form={form} onChange={patchForm} />
        <ProfileEducationSection locale={locale} form={form} onChange={patchForm} />
        <ProfileProjectsSection form={form} onChange={patchForm} />
        <ProfileLinksSection form={form} onChange={patchForm} />
        <ProfileCertificatesSection locale={locale} certificates={certificates} />
        <PortfolioSettingsSection locale={locale} userId={userId} />
      </div>

      {isDirty && (
        <div className="fixed inset-x-4 z-40 flex justify-end bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] lg:top-20 lg:bottom-auto lg:inset-x-auto lg:end-6">
          <Button
            type="button"
            size="lg"
            className="gap-2 shadow-lg"
            disabled={pending}
            onClick={handleSave}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : justSaved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {justSaved ? t('saved') : t('save_changes')}
          </Button>
        </div>
      )}

      <ImportCvModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onApply={handleImportApply}
      />
    </div>
  )
}
