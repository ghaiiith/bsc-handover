import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Marketing request item 1: "export to Excel". Streams every captured lead as
 * a UTF-8 CSV with a BOM so Excel opens the Arabic correctly. Admin only.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data } = await admin
    .from('landing_leads')
    .select('full_name, email, whatsapp, job_title, company_size, source, locale, created_at, downloaded_at')
    .order('created_at', { ascending: false })

  const header = ['الاسم', 'البريد', 'واتساب', 'المسمى الوظيفي', 'حجم الشركة', 'المصدر', 'اللغة', 'تاريخ التسجيل']
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    header.map(cell).join(','),
    ...(data ?? []).map((r) =>
      [r.full_name, r.email, r.whatsapp, r.job_title, r.company_size, r.source, r.locale, r.created_at]
        .map(cell)
        .join(',')
    ),
  ]
  const csv = '﻿' + lines.join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
