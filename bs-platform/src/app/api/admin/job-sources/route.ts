import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'

const sourceSchema = z.object({
  type: z.enum(['telegram', 'linkedin', 'rss']),
  name: z.string().min(2).max(100),
  config: z.record(z.string(), z.unknown()),
  is_active: z.boolean().optional(),
})

export async function GET() {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sources: data ?? [] })
}

export async function POST(request: Request) {
  if (!(await verifyAdminApi())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = sourceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_sources')
    .insert({
      type: parsed.data.type,
      name: parsed.data.name,
      config: parsed.data.config,
      is_active: parsed.data.is_active ?? true,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ source: data })
}
