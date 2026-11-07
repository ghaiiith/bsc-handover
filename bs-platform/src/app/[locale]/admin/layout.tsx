import { getLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getAdminNavCounts } from '@/lib/admin/get-admin-nav-counts'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import { NOINDEX_METADATA } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: { default: 'Admin | Business Skills', template: '%s | Business Skills' },
}

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const locale = await getLocale()
  const { userId, profile } = await requireAdminAccess(locale)
  const counts = await getAdminNavCounts()

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminSidebar locale={locale} counts={counts} />
      <div className="flex min-h-screen flex-col md:ps-64">
        <AdminHeader locale={locale} profile={profile} adminUserId={userId} navCounts={counts} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl [&>*]:mx-auto [&>*]:w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
