'use client'

import PortfolioShell from '@/components/portfolio/PortfolioShell'
import PortfolioHero from '@/components/portfolio/PortfolioHero'
import PortfolioSkills from '@/components/portfolio/PortfolioSkills'
import PortfolioExperience from '@/components/portfolio/PortfolioExperience'
import PortfolioEducation from '@/components/portfolio/PortfolioEducation'
import PortfolioProjects from '@/components/portfolio/PortfolioProjects'
import PortfolioCompletedCourses from '@/components/portfolio/PortfolioCompletedCourses'
import PortfolioInstructorCourses from '@/components/portfolio/PortfolioInstructorCourses'
import PortfolioCertificates from '@/components/portfolio/PortfolioCertificates'
import PortfolioFooter from '@/components/portfolio/PortfolioFooter'
import type { PortfolioData } from '@/types/portfolio'

interface PortfolioPageContentProps {
  locale: string
  data: PortfolioData
  portfolioUrl: string
  displayName: string
  ctaHref: string
}

export default function PortfolioPageContent({
  locale,
  data,
  portfolioUrl,
  displayName,
  ctaHref,
}: PortfolioPageContentProps) {
  const isInstructor = data.variant === 'instructor'

  return (
    <PortfolioShell locale={locale} variant={data.variant} stats={data.stats}>
      <PortfolioHero
        locale={locale}
        user={data.user}
        hasDefaultCv={data.hasDefaultCv}
        portfolioUrl={portfolioUrl}
      />
      <PortfolioSkills skills={data.user.skills} />
      {isInstructor ? (
        <PortfolioInstructorCourses locale={locale} courses={data.taughtCourses} />
      ) : (
        <PortfolioCompletedCourses locale={locale} courses={data.completedCourses} />
      )}
      <PortfolioExperience locale={locale} experience={data.user.experience} />
      <PortfolioEducation locale={locale} education={data.user.education} />
      <PortfolioProjects locale={locale} projects={data.user.projects} />
      {isInstructor && data.completedCourses.length > 0 && (
        <PortfolioCompletedCourses locale={locale} courses={data.completedCourses} />
      )}
      <PortfolioCertificates locale={locale} certificates={data.certificates} />
      <PortfolioFooter
        locale={locale}
        ownerName={displayName}
        variant={data.variant}
        ctaHref={ctaHref}
      />
    </PortfolioShell>
  )
}
