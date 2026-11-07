/** Maps a URL path to a human-readable page description for the system prompt. */
export function parsePageContext(pageContext: string): string {
  const path = pageContext.split('?')[0]?.replace(/\/+$/, '') || '/'
  const segments = path.split('/').filter(Boolean)

  // Strip locale prefix (ar | en)
  const rest = segments[0] === 'ar' || segments[0] === 'en' ? segments.slice(1) : segments
  const section = rest[0] ?? 'home'
  const sub = rest[1]
  const third = rest[2]

  const descriptions: Record<string, string> = {
    home: 'Home / landing page',
    courses: 'Courses listing page — browsing and filtering courses',
    jobs: 'Jobs listing page — browsing job opportunities',
    services: 'Services marketplace listing',
    login: 'Login page',
    register: 'Registration page',
    dashboard: 'Student dashboard — overview, stats, recommendations',
    'cv-builder': 'CV Builder — managing and editing CVs',
    instructor: 'Instructor dashboard — course management',
    admin: 'Admin control panel',
    learn: 'Course learning player — watching lessons',
    payment: 'Payment flow page',
  }

  if (section === 'courses' && sub && sub !== 'new') {
    return 'Course detail page — viewing a specific course, enrollment options'
  }
  if (section === 'jobs' && sub) {
    return 'Job detail page — viewing a job posting and application options'
  }
  if (section === 'services' && sub) {
    return 'Service detail page — viewing or purchasing a service'
  }
  if (section === 'dashboard' && sub === 'profile') {
    return 'User profile page — editing skills, experience, education, CV import'
  }
  if (section === 'dashboard' && sub === 'my-courses') {
    return 'My Courses — enrolled courses list'
  }
  if (section === 'dashboard' && sub === 'become-instructor') {
    return 'Become instructor application page'
  }
  if (section === 'dashboard' && sub === 'orders') {
    return 'Orders page — service purchase orders'
  }
  if (section === 'cv-builder' && sub === 'edit') {
    return 'CV Editor — editing a specific CV'
  }
  if (section === 'cv-builder' && sub) {
    return 'CV Editor — editing a specific CV'
  }
  if (section === 'instructor' && sub === 'courses' && third === 'studio') {
    return 'Instructor course studio — managing curriculum, students, analytics'
  }
  if (section === 'instructor' && sub === 'courses' && third === 'new') {
    return 'Creating a new course (instructor wizard)'
  }
  if (section === 'admin') {
    return `Admin section: ${sub ?? 'overview'}`
  }
  if (section === 'learn' && sub) {
    return 'Course lesson player — actively learning a course'
  }

  return descriptions[section] ?? `Page: /${rest.join('/') || ''}`
}
