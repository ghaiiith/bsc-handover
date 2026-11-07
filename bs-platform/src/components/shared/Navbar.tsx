'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { profileFromAuthUser } from '@/lib/auth/profile-utils'
import { syncUserProfile } from '@/lib/auth/actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import ThemeToggle from '@/components/shared/ThemeToggle'
import NavbarWishlistButton from '@/components/shared/NavbarWishlistButton'
import NavbarNavMenu from '@/components/shared/NavbarNavMenu'
import NotificationsBell from '@/components/shared/NotificationsBell'
import GlobalSearch from '@/components/search/GlobalSearch'
import PushNotificationManager from '@/components/notifications/PushNotificationManager'
import { isFirebaseClientConfigured } from '@/lib/push/firebase-config'
import BrandLogo from '@/components/brand/BrandLogo'
import { Menu, X, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User, UserRole } from '@/types'
import {
  PROFILE_UPDATED_EVENT,
  mergeProfileUpdate,
} from '@/lib/auth/profile-events'
import { getBrowserAuthUser, withClientTimeout } from '@/lib/supabase/safe-browser-auth'
import { getDefaultWorkspacePath } from '@/lib/auth/personalized-home'

interface NavbarProps {
  initialUser?: User | null
  transparentAtTop?: boolean
}

// Fail-open guard so the navbar resolves quickly instead of retry-storming when
// Supabase Auth is slow/unreachable (see proxy.ts for the server-side twin).
const CLIENT_AUTH_TIMEOUT_MS = 4_000

function navRoleLabel(role: UserRole, t: (key: string) => string): string | null {
  switch (role) {
    case 'admin':
      return t('role_admin')
    case 'instructor':
      return t('role_instructor')
    case 'company':
      return t('role_company')
    case 'freelancer':
      return t('role_freelancer')
    default:
      return null
  }
}

export default function Navbar({ initialUser = null, transparentAtTop = false }: NavbarProps) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(initialUser)
  const [authChecked, setAuthChecked] = useState(Boolean(initialUser))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showOffers, setShowOffers] = useState(false)
  const tOffers = useTranslations('offers')
  const isRTL = locale === 'ar'
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`
  const useGlass = scrolled || !transparentAtTop || !isHome

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    void fetch('/api/discounts/active-count')
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data: { count?: number }) => setShowOffers((data.count ?? 0) > 0))
      .catch(() => {})
  }, [])

  const loadUser = useCallback(async () => {
    const supabase = createClient()
    const authUser = await withClientTimeout(
      getBrowserAuthUser(),
      CLIENT_AUTH_TIMEOUT_MS,
      null
    )

    if (!authUser) {
      setUser(null)
      setAuthChecked(true)
      return
    }

    // Own full row (incl. email) via the get_my_profile RPC — the authenticated
    // role can no longer select PII columns directly (migration 044).
    const data = await withClientTimeout(
      (async () => {
        try {
          return (await supabase.rpc('get_my_profile')).data
        } catch {
          return null
        }
      })(),
      CLIENT_AUTH_TIMEOUT_MS,
      null
    )
    // PostgREST may return the row as an object or a one-element array.
    const profile = Array.isArray(data) ? data[0] : data

    if (profile) {
      setUser(profile as User)
    } else {
      const synced = await syncUserProfile()
      if (synced.profile) {
        setUser(synced.profile)
      } else {
        setUser(profileFromAuthUser(authUser))
      }
    }

    setAuthChecked(true)
  }, [])

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
      setAuthChecked(true)
    }
  }, [initialUser])

  useEffect(() => {
    if (!initialUser) {
      void loadUser()
    }

    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser()
    })

    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<User>).detail
      if (detail) {
        setUser((prev) => mergeProfileUpdate(prev, detail))
      }
    }
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated)
    }
  }, [initialUser, loadUser])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push(`/${locale}/login`)
    router.refresh()
  }

  const switchLocale = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar'
    const currentPath = window.location.pathname.replace(`/${locale}`, '')
    router.push(`/${newLocale}${currentPath}`)
  }

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const learnMenuItems = [
    { href: `/${locale}/courses`, label: t('courses'), description: t('learn_courses_desc') },
    // Round 9 (BS-105): editorial articles live under Learn.
    { href: `/${locale}/articles`, label: t('articles'), description: t('learn_articles_desc') },
    ...(user
      ? [
          {
            href: `/${locale}/dashboard/my-learning`,
            label: t('my_learning'),
            description: t('learn_my_learning_desc'),
          },
          {
            href: `/${locale}/dashboard/certificates`,
            label: t('certificates_nav'),
            description: t('learn_certificates_desc'),
          },
        ]
      : []),
  ]

  const workMenuItems = [
    { href: `/${locale}/jobs`, label: t('jobs'), description: t('work_jobs_desc') },
    { href: `/${locale}/services`, label: t('services'), description: t('work_services_desc') },
    ...(showOffers
      ? [
          {
            href: `/${locale}/offers`,
            label: tOffers('nav_label'),
            description: t('work_offers_desc'),
          },
        ]
      : []),
  ]

  const userRoleLabel = user ? navRoleLabel(user.role, t) : null
  const brandHref = `/${locale}`
  const workspaceHref = user && authChecked
    ? getDefaultWorkspacePath(locale, user.role)
    : `/${locale}/dashboard`

  return (
    <>
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-400',
        useGlass
          ? 'border-b edu-glass shadow-sm'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center gap-3 lg:gap-4">
          {/* Brand + desktop nav */}
          <div className="flex min-w-0 items-center gap-4 lg:gap-6">
            <BrandLogo
              href={brandHref}
              locale={locale}
              orientation="horizontal"
              mode="full"
              interactive
              className="hidden shrink-0 lg:flex"
            />
            <BrandLogo
              href={brandHref}
              locale={locale}
              orientation="horizontal"
              mode="compact"
              iconSize={28}
              interactive
              className="flex shrink-0 lg:hidden"
            />

            <nav className="hidden lg:flex items-center gap-0.5">
              <NavbarNavMenu label={t('learn')} items={learnMenuItems} isRTL={isRTL} alwaysDropdown />
              <NavbarNavMenu label={t('work')} items={workMenuItems} isRTL={isRTL} />
              <Link
                href={`/${locale}/community`}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(`/${locale}/community`)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {t('community')}
              </Link>
            </nav>
          </div>

          {/* Search — center on desktop */}
          <div className="hidden min-w-0 flex-1 lg:flex lg:justify-center lg:px-4">
            <GlobalSearch className="w-full max-w-md" />
          </div>

          {/* Actions */}
          <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
            {user && authChecked && (
              <div className="hidden sm:contents">
                <NotificationsBell locale={locale} userId={user.id} />
              </div>
            )}

            <div className="hidden items-center rounded-lg border bg-muted/40 p-0.5 sm:flex">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={switchLocale}
                className="h-8 w-8"
                aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              >
                <Globe className="h-4 w-4" />
              </Button>
            </div>

            {!authChecked ? (
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full ps-1 pe-2 py-1 hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Avatar className="h-8 w-8">
                    <AvatarImage key={user.avatar_url ?? 'no-avatar'} src={user.avatar_url ?? ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[7rem] truncate text-sm font-medium md:inline">
                    {user.full_name?.split(' ')[0]}
                  </span>
                  {userRoleLabel ? (
                    <Badge variant="secondary" className="hidden text-[10px] lg:inline-flex">
                      {userRoleLabel}
                    </Badge>
                  ) : null}
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-52">
                  <DropdownMenuItem onClick={() => router.push(workspaceHref)}>
                    {t('dashboard')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/my-learning`)}>
                    {t('my_learning')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/wishlist`)}>
                    {t('wishlist')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/${locale}/dashboard/profile`)}>
                    {t('my_profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/${locale}/cv-builder`)}>
                    {t('cv_builder')}
                  </DropdownMenuItem>
                  {user.role === 'company' && (
                    <DropdownMenuItem
                      onClick={() => router.push(`/${locale}/dashboard/company-jobs`)}
                    >
                      {t('company_dashboard')}
                    </DropdownMenuItem>
                  )}
                  {user.role === 'instructor' && (
                    <DropdownMenuItem onClick={() => router.push(`/${locale}/instructor`)}>
                      {t('instructor_dashboard')}
                    </DropdownMenuItem>
                  )}
                  {user.role === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => router.push(`/${locale}/admin`)}>
                        {t('admin_dashboard')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/${locale}/instructor`)}>
                        {t('instructor_dashboard')}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-1.5 sm:hidden">
                    <NavbarWishlistButton />
                    <NotificationsBell locale={locale} userId={user.id} />
                  </div>
                  <DropdownMenuSeparator className="sm:hidden" />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href={`/${locale}/login`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                >
                  {t('login')}
                </Link>
                <Link
                  href={`/${locale}/register`}
                  className={cn(buttonVariants({ size: 'sm' }))}
                >
                  {t('register')}
                </Link>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? t('close_menu') : t('open_menu')}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 lg:hidden border-t edu-glass max-h-[min(80vh,calc(100dvh-4rem))] overflow-y-auto overscroll-contain">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
              <div className="mb-3">
                <GlobalSearch
                  variant="drawer"
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>

              {user && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border bg-background/80 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage key={user.avatar_url ?? 'no-avatar'} src={user.avatar_url ?? ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}

              {user && (
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <Link
                    href={workspaceHref}
                    className="rounded-lg border bg-background px-3 py-2.5 text-sm font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('dashboard')}
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/profile`}
                    className="rounded-lg border bg-background px-3 py-2.5 text-sm font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('my_profile')}
                  </Link>
                </div>
              )}

              <p className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('learn')}
              </p>
              {learnMenuItems.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname.startsWith(link.href)
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <p className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('work')}
              </p>
              {workMenuItems.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname.startsWith(link.href)
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <Link
                href={`/${locale}/community`}
                className={cn(
                  'mt-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  pathname.startsWith(`/${locale}/community`)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setMobileOpen(false)}
              >
                {t('community')}
              </Link>

              {user && (
                <>
                  <p className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('account')}
                  </p>
                  {[
                    { href: `/${locale}/dashboard/my-learning`, label: t('my_learning') },
                    { href: `/${locale}/dashboard/wishlist`, label: t('wishlist') },
                    { href: `/${locale}/dashboard/notifications`, label: t('notifications') },
                    { href: `/${locale}/cv-builder`, label: t('cv_builder') },
                    ...(user.role === 'company'
                      ? [
                          {
                            href: `/${locale}/dashboard/company-jobs`,
                            label: t('company_dashboard'),
                          },
                        ]
                      : []),
                    ...(user.role === 'instructor' || user.role === 'admin'
                      ? [{ href: `/${locale}/instructor`, label: t('instructor_dashboard') }]
                      : []),
                    ...(user.role === 'admin'
                      ? [{ href: `/${locale}/admin`, label: t('admin_dashboard') }]
                      : []),
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false)
                      void handleLogout()
                    }}
                    className="rounded-lg px-3 py-2.5 text-start text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    {t('logout')}
                  </button>
                </>
              )}

              {!user && authChecked && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-4">
                  <Link
                    href={`/${locale}/login`}
                    className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('login')}
                  </Link>
                  <Link
                    href={`/${locale}/register`}
                    className={cn(buttonVariants(), 'w-full')}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('register')}
                  </Link>
                </div>
              )}

              <div className="mt-3 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    switchLocale()
                    setMobileOpen(false)
                  }}
                  className="w-full justify-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  {locale === 'ar' ? 'English' : 'العربية'}
                </Button>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
    {user && isFirebaseClientConfigured() && (
      <PushNotificationManager userId={user.id} locale={locale} />
    )}
    </>
  )
}
