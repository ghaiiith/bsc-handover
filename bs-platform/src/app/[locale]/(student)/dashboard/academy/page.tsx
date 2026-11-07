import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/profile'
import { getPersonalizedHomePath } from '@/lib/auth/personalized-home'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAcademySeatTiers } from '@/lib/company/academy-tiers'
import AcademySeatCalculator, {
  type AcademyCourseOption,
} from '@/components/company/AcademySeatCalculator'

// Report BS-70: Company Academy — its own tab with a bulk seat calculator that
// shows the normal total, the bulk price and the amount saved.
export default async function CompanyAcademyPage() {
  const locale = await getLocale()
  const t = await getTranslations('academy')
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)
  if (session.profile?.role !== 'company') redirect(getPersonalizedHomePath(locale))

  const admin = createAdminClient()
  const [{ data: courseRows }, tiers] = await Promise.all([
    admin
      .from('courses')
      .select('id, title, title_ar, price')
      .eq('status', 'published')
      .gt('price', 0)
      .order('created_at', { ascending: false })
      .limit(100),
    getAcademySeatTiers(),
  ])

  const courses: AcademyCourseOption[] = (courseRows ?? []).map((c) => ({
    id: c.id as string,
    title: (c.title as string) ?? '',
    title_ar: (c.title_ar as string) ?? '',
    price: Number(c.price) || 0,
  }))

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <AcademySeatCalculator courses={courses} tiers={tiers} />
    </div>
  )
}
