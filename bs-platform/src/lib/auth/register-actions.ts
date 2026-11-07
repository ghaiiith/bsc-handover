'use server'

import type { AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/auth/profile'
import { syncUserAuthClaims } from '@/lib/auth/sync-user-claims'
import { getAppUrl } from '@/lib/seo/metadata'

export type RegisterErrorCode =
  | 'email_taken'
  | 'weak_password'
  | 'database_error'
  | 'signup_disabled'
  | 'rate_limit'
  | 'invalid_email'
  | 'register_failed'

export interface RegisterResult {
  success?: boolean
  userId?: string
  needsEmailConfirmation?: boolean
  error?: RegisterErrorCode
}

function mapRegisterError(error: AuthError): RegisterErrorCode {
  const message = error.message.toLowerCase()

  if (
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('user already exists')
  ) {
    return 'email_taken'
  }

  if (message.includes('database error')) {
    return 'database_error'
  }

  if (message.includes('password') && message.includes('weak')) {
    return 'weak_password'
  }

  if (message.includes('signup') && message.includes('disabled')) {
    return 'signup_disabled'
  }

  if (message.includes('rate limit') || message.includes('too many')) {
    return 'rate_limit'
  }

  if (message.includes('invalid') && message.includes('email')) {
    return 'invalid_email'
  }

  return 'register_failed'
}

export async function registerUser(input: {
  email: string
  password: string
  fullName: string
  locale: string
}): Promise<RegisterResult> {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  const appUrl = getAppUrl()

  if (!email || !fullName || input.password.length < 8) {
    return { error: 'register_failed' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${appUrl}/auth/callback?locale=${input.locale}`,
    },
  })

  if (error) {
    console.error('[auth] register failed:', error.message, error.status)
    return { error: mapRegisterError(error) }
  }

  // Supabase anti-enumeration: existing email returns user with no identities
  if (data.user?.identities?.length === 0) {
    return { error: 'email_taken' }
  }

  if (data.user && data.session) {
    const profile = await ensureUserProfile(data.user)
    if (!profile) {
      console.error('[auth] register: auth user created but profile sync failed')
      return { error: 'database_error' }
    }
    await syncUserAuthClaims(data.user.id)
  }

  return {
    success: true,
    userId: data.user?.id,
    needsEmailConfirmation: Boolean(data.user && !data.session),
  }
}
