import type { DashboardNavIconKey } from '@/lib/dashboard/nav-icon-keys'
import type { UserRole } from '@/types'

export interface DashboardNavLink {
  href: string
  labelKey: string
  iconKey: DashboardNavIconKey
  exact?: boolean
  score?: boolean
  cvBadge?: boolean
  badge?: number
}

export interface DashboardNavGroup {
  key: string
  links: DashboardNavLink[]
}

const BASE_STUDENT_GROUP_DEFS: { key: string; linkKeys: string[] }[] = [
  {
    key: 'learning',
    linkKeys: ['overview', 'my_learning', 'my_courses', 'certificates', 'wishlist'],
  },
  { key: 'account', linkKeys: ['notifications', 'messages', 'profile', 'cv_builder', 'settings'] },
  { key: 'discover', linkKeys: ['offers', 'jobs', 'community'] },
]

function studentLinks(locale: string): DashboardNavLink[] {
  return [
    {
      href: `/${locale}/dashboard`,
      labelKey: 'overview',
      iconKey: 'layout-dashboard',
      exact: true,
    },
    { href: `/${locale}/dashboard/my-learning`, labelKey: 'my_learning', iconKey: 'book-open' },
    // Integration: the AI Learning Assistant (course + job recommendations + chat).
    { href: `/${locale}/dashboard/assistant`, labelKey: 'assistant', iconKey: 'sparkles' },
    { href: `/${locale}/dashboard/my-courses`, labelKey: 'my_courses', iconKey: 'book-open' },
    { href: `/${locale}/dashboard/certificates`, labelKey: 'certificates', iconKey: 'award' },
    { href: `/${locale}/dashboard/wishlist`, labelKey: 'wishlist', iconKey: 'heart' },
    { href: `/${locale}/offers`, labelKey: 'offers', iconKey: 'sparkles' },
    { href: `/${locale}/dashboard/notifications`, labelKey: 'notifications', iconKey: 'bell' },
    { href: `/${locale}/dashboard/messages`, labelKey: 'messages', iconKey: 'message-square' },
    {
      href: `/${locale}/dashboard/profile`,
      labelKey: 'profile',
      iconKey: 'user',
      score: true,
    },
    { href: `/${locale}/cv-builder`, labelKey: 'cv_builder', iconKey: 'file-text', cvBadge: true },
    { href: `/${locale}/dashboard/settings`, labelKey: 'settings', iconKey: 'settings' },
    { href: `/${locale}/jobs`, labelKey: 'jobs', iconKey: 'briefcase' },
    { href: `/${locale}/dashboard/my-applications`, labelKey: 'my_applications', iconKey: 'file-text' },
    { href: `/${locale}/dashboard/saved-jobs`, labelKey: 'saved_jobs', iconKey: 'heart' },
    { href: `/${locale}/community`, labelKey: 'community', iconKey: 'users' },
  ]
}

function instructorWorkspaceLinks(locale: string): DashboardNavLink[] {
  return [
    {
      href: `/${locale}/instructor`,
      labelKey: 'instructor_home',
      iconKey: 'graduation-cap',
      exact: true,
    },
    { href: `/${locale}/instructor/courses`, labelKey: 'my_courses', iconKey: 'book-open' },
    { href: `/${locale}/instructor/earnings`, labelKey: 'earnings', iconKey: 'wallet' },
    { href: `/${locale}/instructor/discounts`, labelKey: 'manage_discounts', iconKey: 'sparkles' },
    {
      href: `/${locale}/instructor/certificate-requests`,
      labelKey: 'certificate_requests',
      iconKey: 'award',
    },
    // Report BS-71: instructors may also offer services (consulting/training).
    // canOfferServices() already allows role 'instructor'; these expose it.
    { href: `/${locale}/dashboard/my-services`, labelKey: 'my_services', iconKey: 'wrench' },
    { href: `/${locale}/dashboard/services/new`, labelKey: 'create_service', iconKey: 'sparkles' },
    { href: `/${locale}/dashboard/orders/incoming`, labelKey: 'incoming_orders', iconKey: 'inbox' },
  ]
}

function companyWorkspaceLinks(locale: string): DashboardNavLink[] {
  return [
    {
      href: `/${locale}/dashboard/company-jobs`,
      labelKey: 'company_jobs',
      iconKey: 'briefcase',
      exact: true,
    },
    // Report BS-70: Company Academy is its own destination.
    {
      href: `/${locale}/dashboard/academy`,
      labelKey: 'company_academy',
      iconKey: 'graduation-cap',
    },
    {
      href: `/${locale}/dashboard/subscription`,
      labelKey: 'subscription',
      iconKey: 'wallet',
    },
  ]
}

function freelancerWorkspaceLinks(locale: string): DashboardNavLink[] {
  return [
    { href: `/${locale}/dashboard/my-services`, labelKey: 'my_services', iconKey: 'wrench' },
    { href: `/${locale}/dashboard/services/new`, labelKey: 'create_service', iconKey: 'sparkles' },
    { href: `/${locale}/dashboard/orders/incoming`, labelKey: 'incoming_orders', iconKey: 'inbox' },
    { href: `/${locale}/dashboard/orders/my-orders`, labelKey: 'my_orders', iconKey: 'shopping-bag' },
    { href: `/${locale}/services`, labelKey: 'services_marketplace', iconKey: 'shopping-bag' },
  ]
}

function groupLinks(
  links: DashboardNavLink[],
  groupDefs: { key: string; linkKeys: string[] }[]
): DashboardNavGroup[] {
  return groupDefs
    .map((def) => ({
      key: def.key,
      links: def.linkKeys
        .map((key) => links.find((l) => l.labelKey === key))
        .filter((l): l is DashboardNavLink => Boolean(l)),
    }))
    .filter((g) => g.links.length > 0)
}

export function getBaseStudentNavGroups(locale: string): DashboardNavGroup[] {
  return groupLinks(studentLinks(locale), BASE_STUDENT_GROUP_DEFS)
}

/**
 * Report BS-45: the account tabs common to every non-student role. A company /
 * service provider / instructor sees ONLY their workspace plus these — never the
 * student learning tabs (my-learning, certificates, wishlist, …).
 */
export function getCommonAccountNavGroups(locale: string): DashboardNavGroup[] {
  return groupLinks(studentLinks(locale), [
    { key: 'account', linkKeys: ['notifications', 'messages', 'profile', 'settings'] },
  ])
}

export function getInstructorRoleNavGroups(
  locale: string,
  mode: 'application' | 'approved'
): DashboardNavGroup[] {
  if (mode === 'approved') {
    return groupLinks(instructorWorkspaceLinks(locale), [
      {
        key: 'instructor',
        linkKeys: [
          'instructor_home',
          'my_courses',
          'earnings',
          'manage_discounts',
          'certificate_requests',
          // Report BS-71: services for instructors.
          'my_services',
          'create_service',
          'incoming_orders',
        ],
      },
    ])
  }
  return [
    {
      key: 'instructor',
      links: [
        {
          href: `/${locale}/dashboard/become-instructor`,
          labelKey: 'become_instructor',
          iconKey: 'graduation-cap',
        },
      ],
    },
  ]
}

export function getCompanyRoleNavGroups(
  locale: string,
  mode: 'application' | 'approved'
): DashboardNavGroup[] {
  if (mode === 'approved') {
    return groupLinks(companyWorkspaceLinks(locale), [
      { key: 'company', linkKeys: ['company_jobs', 'company_academy', 'subscription'] },
    ])
  }
  return [
    {
      key: 'company',
      links: [
        {
          href: `/${locale}/dashboard/company-affiliation`,
          labelKey: 'company_affiliation',
          iconKey: 'briefcase',
        },
      ],
    },
  ]
}

export function getFreelancerRoleNavGroups(
  locale: string,
  mode: 'application' | 'approved'
): DashboardNavGroup[] {
  if (mode === 'approved') {
    return groupLinks(freelancerWorkspaceLinks(locale), [
      {
        key: 'freelancer',
        linkKeys: [
          'my_services',
          'create_service',
          'incoming_orders',
          'my_orders',
          'services_marketplace',
        ],
      },
    ])
  }
  return [
    {
      key: 'freelancer',
      links: [
        {
          href: `/${locale}/dashboard/become-freelancer`,
          labelKey: 'become_freelancer',
          iconKey: 'store',
        },
      ],
    },
  ]
}

export function getAdminRoleNavGroups(locale: string): DashboardNavGroup[] {
  return [
    {
      key: 'admin',
      links: [
        {
          href: `/${locale}/admin`,
          labelKey: 'admin_home',
          iconKey: 'shield',
          exact: true,
        },
        {
          href: `/${locale}/admin/instructor-requests`,
          labelKey: 'instructor_requests',
          iconKey: 'graduation-cap',
        },
        {
          href: `/${locale}/admin/company-requests`,
          labelKey: 'company_requests',
          iconKey: 'briefcase',
        },
        {
          href: `/${locale}/admin/freelancer-requests`,
          labelKey: 'freelancer_requests',
          iconKey: 'store',
        },
      ],
    },
  ]
}

/** @deprecated Use getDashboardNavGroups — kept for admin cross-links if needed */
export function getDashboardNavLinks(locale: string, role: UserRole): DashboardNavLink[] {
  if (role === 'admin') {
    return [
      { href: `/${locale}/admin`, labelKey: 'admin_home', iconKey: 'shield', exact: true },
      {
        href: `/${locale}/dashboard`,
        labelKey: 'student_dashboard',
        iconKey: 'layout-dashboard',
        exact: true,
      },
    ]
  }
  return studentLinks(locale)
}

export function isDashboardNavLinkActive(pathname: string, link: DashboardNavLink): boolean {
  if (link.exact) {
    return pathname === link.href || pathname === `${link.href}/`
  }
  return pathname.startsWith(link.href)
}
