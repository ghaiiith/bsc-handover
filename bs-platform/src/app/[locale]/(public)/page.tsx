import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import { getSessionProfile, isProfileOnboardingComplete } from '@/lib/auth/profile'
import CareerNetworkBackground from '@/components/landing/CareerNetworkBackground'
import LandingHero from '@/components/landing/LandingHero'
import HomepagePartnersSection from '@/components/landing/HomepagePartnersSection'
import GrowthGuideStrip from '@/components/landing/GrowthGuideStrip'
import TrustSection from '@/components/landing/TrustSection'
import FeaturedCoursesSection from '@/components/landing/FeaturedCoursesSection'
import CtaSection from '@/components/landing/CtaSection'
import LandingFooter from '@/components/landing/LandingFooter'
import { getLandingData } from '@/lib/landing/get-landing-data'
import { getCachedPublishedCourses } from '@/lib/courses/list-courses'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'

export const revalidate = 120

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === 'ar'

  return buildPageMetadata({
    locale,
    path: '',
    title: isAr
      ? `${BRAND_FULL_NAME} — تعلّم، اعمل، وانطلق`
      : `${BRAND_FULL_NAME} — Learn, Work, and Grow`,
    description: isAr
      ? `${BRAND_FULL_NAME} — منصة ثنائية اللغة للكورسات والوظائف والخدمات والشهادات والنمو المهني`
      : 'A bilingual platform for courses, jobs, services, certificates, and professional growth.',
  })
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getSessionProfile()
  if (session) {
    const { profile } = session
    if (profile.is_active === false) {
      redirect(`/${locale}/account-suspended`)
    }
    if (!isProfileOnboardingComplete(profile)) {
      redirect(`/${locale}/onboarding`)
    }
  }

  const [data, coursesResult] = await Promise.all([
    getLandingData(),
    getCachedPublishedCourses({ page: 1 }),
  ])
  const featuredCourses = coursesResult.courses.slice(0, 6)

  return (
    <div className="relative min-h-screen">
      <CareerNetworkBackground />
      <Navbar transparentAtTop />
      <main>
        {/* Report BS-72/73: the hero carries the admin-managed rotating banner
            with the three service cards beside it. */}
        <LandingHero banners={data.banners} />
        {/* One obvious place on the homepage to reach the free guide. */}
        <GrowthGuideStrip />
        <FeaturedCoursesSection courses={featuredCourses} />
        {/* Report BS-74: companies slider + trainers replace "Platform Features". */}
        <HomepagePartnersSection
          curatedCompanies={data.curatedCompanies}
          companies={data.companies}
          instructors={data.instructors}
        />
        <TrustSection stats={data.stats} />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}
