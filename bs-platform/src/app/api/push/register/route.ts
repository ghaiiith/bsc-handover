import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const registerSchema = z.object({
  token: z.string().min(20),
  locale: z.enum(['ar', 'en']).optional(),
  deviceLabel: z.string().max(120).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const { token, locale, deviceLabel } = parsed.data
  const userAgent = request.headers.get('user-agent') ?? undefined

  const { error } = await supabase.from('fcm_tokens').upsert(
    {
      user_id: user.id,
      token,
      locale: locale ?? 'ar',
      device_label: deviceLabel ?? userAgent?.slice(0, 120) ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  )

  if (error) {
    console.error('[push/register]', error.message)
    return NextResponse.json({ error: 'register_failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
