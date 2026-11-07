import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'
import { broadcastNotification } from '@/lib/admin/broadcast'

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  titleAr: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(1000),
  bodyAr: z.string().trim().min(1).max(1000),
  audience: z.enum(['all', 'student', 'instructor', 'admin', 'company', 'freelancer']),
})

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

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed' }, { status: 400 })
  }

  const result = await broadcastNotification(parsed.data)
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'broadcast_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, recipients: result.recipients })
}
