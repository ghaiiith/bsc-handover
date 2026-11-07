import { getLocale, getTranslations } from 'next-intl/server'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import CandidateBulkImport from '@/components/admin/CandidateBulkImport'

export default async function AdminCandidatesPage() {
  const locale = await getLocale()
  const t = await getTranslations('candidates_import')
  await requireAdminAccess(locale)

  const admin = createAdminClient()
  const { count } = await admin
    .from('candidates')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('page_title')}</h1>
        <p className="text-muted-foreground">{t('page_subtitle')}</p>
      </div>
      <CandidateBulkImport candidateCount={count ?? 0} />
    </div>
  )
}

export const metadata = { title: 'Candidates — Admin' }
