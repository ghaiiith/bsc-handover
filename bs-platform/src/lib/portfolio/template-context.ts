import type { PortfolioData } from '@/types/portfolio'
import type { TemplateContext } from '@/lib/portfolio/template-engine'
import { escapeHtml } from '@/lib/portfolio/template-engine'

/**
 * Report BS-35: turns the portfolio data we already load into the flat, plain
 * shape an uploaded HTML template can read. Every value is a string, number or
 * array of plain objects — no dates, no nested Supabase rows.
 */

function yearOf(value?: string | null): string {
  if (!value) return ''
  const year = new Date(value).getFullYear()
  return Number.isFinite(year) ? String(year) : ''
}

function monthYear(value?: string | null, locale = 'en'): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale === 'ar' ? 'ar' : 'en', {
    month: 'short',
    year: 'numeric',
  })
}

export function buildTemplateContext(
  data: PortfolioData,
  options: { locale: string; portfolioUrl: string }
): TemplateContext {
  const { locale, portfolioUrl } = options
  const isAr = locale === 'ar'
  const user = data.user

  const present = isAr ? 'الآن' : 'Present'

  const links = user.links ?? {}
  const linkList = (
    [
      { key: 'linkedin', label: 'LinkedIn', url: links.linkedin },
      { key: 'github', label: 'GitHub', url: links.github },
      { key: 'website', label: isAr ? 'الموقع' : 'Website', url: links.website },
      { key: 'twitter', label: 'X / Twitter', url: links.twitter },
    ] as const
  )
    .filter((l) => Boolean(l.url))
    .map((l) => ({ key: l.key, label: l.label, url: l.url as string }))

  // Pre-rendered anchor list for templates that just want one blob of links.
  const linksHtml = linkList
    .map(
      (l) =>
        `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(l.label)}</a>`
    )
    .join('')

  return {
    // Identity
    name: (isAr ? user.full_name_ar || user.full_name : user.full_name) ?? '',
    name_en: user.full_name ?? '',
    name_ar: user.full_name_ar ?? '',
    headline: user.headline ?? '',
    bio: (isAr ? user.bio_ar || user.bio : user.bio) ?? '',
    avatar_url: user.avatar_url ?? '',
    location: user.location ?? '',
    years_of_experience: user.years_of_experience ?? '',
    available: user.availability ? (isAr ? 'متاح للعمل' : 'Available for work') : '',
    role: user.role,
    locale,
    dir: isAr ? 'rtl' : 'ltr',
    year: String(new Date().getFullYear()),
    portfolio_url: portfolioUrl,

    // Collections
    skills: (user.skills ?? []).filter(Boolean),
    experience: (user.experience ?? []).map((item) => ({
      title: item.title ?? '',
      company: item.company ?? '',
      location: item.location ?? '',
      description: item.description ?? '',
      start_date: monthYear(item.start_date, locale),
      end_date: item.is_current ? present : monthYear(item.end_date, locale),
      period: `${monthYear(item.start_date, locale)} — ${
        item.is_current ? present : monthYear(item.end_date, locale)
      }`,
      is_current: item.is_current ?? false,
    })),
    education: (user.education ?? []).map((item) => ({
      institution: item.institution ?? '',
      degree: item.degree ?? '',
      field: item.field ?? '',
      start_year: item.start_year ?? '',
      end_year: item.is_current ? present : item.end_year ?? '',
      period: `${item.start_year ?? ''} — ${item.is_current ? present : item.end_year ?? ''}`,
      gpa: item.gpa ?? '',
    })),
    projects: (user.projects ?? []).map((item) => ({
      name: item.name ?? '',
      description: item.description ?? '',
      technologies: item.technologies ?? [],
      url: item.url ?? '',
      github_url: item.github_url ?? '',
    })),
    courses: data.completedCourses.map((course) => ({
      title: isAr ? course.title_ar || course.title : course.title,
      category: course.category ?? '',
      thumbnail_url: course.thumbnail_url ?? '',
      instructor: isAr
        ? course.instructor_name_ar || course.instructor_name
        : course.instructor_name,
    })),
    taught_courses: data.taughtCourses.map((course) => ({
      title: isAr ? course.title_ar || course.title : course.title,
      category: course.category ?? '',
      thumbnail_url: course.thumbnail_url ?? '',
      students: course.enrollment_count ?? 0,
      rating: course.avg_rating ?? 0,
      lessons: course.total_lessons ?? 0,
    })),
    certificates: data.certificates.map((cert) => ({
      title: isAr ? cert.course_title_ar || cert.course_title : cert.course_title,
      code: cert.verification_code,
      instructor: isAr
        ? cert.instructor_name_ar || cert.instructor_name
        : cert.instructor_name,
      year: yearOf(cert.issued_at),
    })),
    links: linkList,
    links_html: linksHtml,
    linkedin: links.linkedin ?? '',
    github: links.github ?? '',
    website: links.website ?? '',
    twitter: links.twitter ?? '',

    // Counters
    skills_count: data.stats.skillsCount,
    projects_count: data.stats.projectsCount,
    courses_count: data.stats.completedCoursesCount,
    certificates_count: data.stats.certificatesCount,
    taught_courses_count: data.stats.taughtCoursesCount,
    students_count: data.stats.totalStudents,
    avg_rating: data.stats.avgCourseRating,
  }
}
