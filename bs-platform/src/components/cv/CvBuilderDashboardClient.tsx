'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PenLine, Upload, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import CvProfileCard from '@/components/cv/CvProfileCard'
import ImportCvModal from '@/components/profile/ImportCvModal'
import { extractedProfileToFormData } from '@/lib/cv/mappers'
import { MAX_CV_PROFILES } from '@/lib/cv/constants'
import { formatCount } from '@/lib/format-number'
import type { CVProfile } from '@/types/cv'
import type { CvExtractedProfile } from '@/types/profile'
import { cn } from '@/lib/utils'

interface CvBuilderDashboardClientProps {
  locale: string
  profiles: CVProfile[]
  profileScore: number
  portfolioSlug?: string | null
}

export default function CvBuilderDashboardClient({
  locale,
  profiles: initialProfiles,
  profileScore,
  portfolioSlug,
}: CvBuilderDashboardClientProps) {
  const t = useTranslations('cv')
  const tPortfolio = useTranslations('portfolio')
  const router = useRouter()
  const [profiles, setProfiles] = useState(initialProfiles)
  const [importOpen, setImportOpen] = useState(false)
  const atMax = profiles.length >= MAX_CV_PROFILES

  const refresh = useCallback(() => {
    router.refresh()
    void fetch('/api/cv/list')
      .then((r) => r.json())
      .catch(() => null)
      .then((data: { profiles?: CVProfile[] } | null) => {
        if (data?.profiles) setProfiles(data.profiles)
      })
  }, [router])

  const handleImportApply = (extracted: CvExtractedProfile) => {
    const formData = extractedProfileToFormData(extracted, locale === 'ar' ? 'ar' : 'en')
    sessionStorage.setItem('cv-import-draft', JSON.stringify(formData))
    router.push(`/${locale}/cv-builder/new?source=import`)
  }

  if (profiles.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{t('builder_title')}</h1>
          <p className="text-muted-foreground">{t('no_cvs_yet')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-1">
          <Card className="relative border-primary/30 shadow-md">
            <Badge className="absolute top-4 end-4">{t('recommended')}</Badge>
            <CardHeader>
              <UserRound className="h-10 w-10 text-primary mb-2" />
              <CardTitle>{t('start_from_profile')}</CardTitle>
              <CardDescription>
                {t('start_from_profile_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground num-en">
                Profile completion: {formatCount(profileScore)}%
              </p>
              {profileScore < 50 && (
                <p className="text-sm text-amber-600">
                  {t('profile_incomplete')}{' '}
                  <Link href={`/${locale}/dashboard/profile`} className="underline">
                    {t('complete_profile_link')}
                  </Link>
                </p>
              )}
              <Link
                href={`/${locale}/cv-builder/new?source=profile`}
                className={cn(buttonVariants(), 'w-full sm:w-auto')}
              >
                {t('start_now')}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <PenLine className="h-10 w-10 text-muted-foreground mb-2" />
              <CardTitle>{t('start_from_scratch')}</CardTitle>
              <CardDescription>{t('start_from_scratch_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={`/${locale}/cv-builder/new?source=scratch`}
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}
              >
                {t('start_from_scratch')}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <CardTitle>{t('import_existing')}</CardTitle>
              <CardDescription>{t('import_existing_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
                {t('upload_cv')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <ImportCvModal open={importOpen} onOpenChange={setImportOpen} onApply={handleImportApply} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('my_cvs')}</h1>
        <span title={atMax ? t('max_cvs_reached') : undefined}>
          <Link
            href={atMax ? '#' : `/${locale}/cv-builder/new?source=profile`}
            className={cn(buttonVariants(), atMax && 'pointer-events-none opacity-50')}
            aria-disabled={atMax}
          >
            {t('new_cv')}
          </Link>
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {profiles.map((profile) => (
          <CvProfileCard
            key={profile.id}
            locale={locale}
            profile={profile}
            onUpdate={refresh}
            allProfiles={profiles}
          />
        ))}
      </div>

      {portfolioSlug && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold">{tPortfolio('share_achievement')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'ar'
                  ? 'ملفك العام يحتوي على سيرتك الذاتية وكورساتك المكتملة ومشاريعك'
                  : 'Your public profile includes your CV, completed courses, and projects'}
              </p>
            </div>
            <Link
              href={`/${locale}/portfolio/${portfolioSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0')}
            >
              {tPortfolio('view_my_portfolio')} →
            </Link>
          </CardContent>
        </Card>
      )}

      <ImportCvModal open={importOpen} onOpenChange={setImportOpen} onApply={handleImportApply} />
    </div>
  )
}
