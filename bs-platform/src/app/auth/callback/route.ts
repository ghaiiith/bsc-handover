import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureUserProfile } from '@/lib/auth/profile'
import { syncUserAuthClaims } from '@/lib/auth/sync-user-claims'
import { extractSessionId, setActiveSession } from '@/lib/auth/single-session'
import { getDefaultWorkspacePath } from '@/lib/auth/personalized-home'
import { getAppUrl } from '@/lib/seo/metadata'

async function syncOAuthProfile(userId: string, metadata: Record<string, unknown>) {
  const fullName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    null

  const avatarUrl =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata.picture === 'string' && metadata.picture) ||
    null

  if (!fullName && !avatarUrl) return

  try {
    const admin = createAdminClient()
    const updates: Record<string, string> = {}
    if (fullName) updates.full_name = fullName
    if (avatarUrl) updates.avatar_url = avatarUrl

    await admin.from('users').update(updates).eq('id', userId)
  } catch (err) {
    console.error('[auth/callback] profile sync failed:', err)
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Behind the nginx proxy `new URL(request.url).origin` resolves to the internal
  // upstream (localhost:3000), so redirects must be built from the public app URL.
  const origin = getAppUrl()
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const locale = searchParams.get('locale') === 'en' ? 'en' : 'ar'

  if (errorParam === 'access_denied') {
    return NextResponse.redirect(`${origin}/${locale}/login?error=access_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/login?error=oauth_error`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback]', error?.message)
    return NextResponse.redirect(`${origin}/${locale}/login?error=oauth_error`)
  }

  await ensureUserProfile(data.user)
  await syncUserAuthClaims(data.user.id)
  // Single active session (report BS-04): bless this login's GoTrue session id
  // (native `session_id` claim — no token refresh needed). We do NOT revoke other
  // sessions server-side (scope:'others'): the proxy already shuts out any device
  // whose JWT session_id differs from `active_session_id` on every request, and a
  // mistimed revoke can kill the fresh login's own tokens (see session-actions).
  const sessionId = extractSessionId(data.session?.access_token)
  if (sessionId) {
    await setActiveSession(data.user.id, sessionId)
  }
  await syncOAuthProfile(data.user.id, data.user.user_metadata ?? {})

  const { data: profileRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const role = profileRow?.role ?? 'student'

  // Students land on the Courses catalogue after sign-in (report BS-07).
  const destination =
    role === 'student' ? `/${locale}/courses` : getDefaultWorkspacePath(locale, role)
  return NextResponse.redirect(`${origin}${destination}`)
}
