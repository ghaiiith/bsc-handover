'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { syncUserProfile } from '@/lib/auth/actions'
import { getDefaultWorkspacePath } from '@/lib/auth/personalized-home'
import { establishSingleSession } from '@/lib/auth/session-actions'
import { readSessionIdFromToken } from '@/lib/auth/jwt-session-id'
import { resolvePostAuthRedirect } from '@/lib/onboarding/post-auth-redirect'
import { mapLoginError, mapOAuthErrorParam } from '@/lib/auth/login-errors'
import AuthCard from '@/components/auth/AuthCard'
import AuthLogoMark from '@/components/auth/AuthLogoMark'
import GoogleAuthButton from '@/components/auth/GoogleAuthButton'
import { isGoogleAuthEnabled } from '@/lib/auth/oauth-providers'
import OrDivider from '@/components/auth/OrDivider'
import AuthInput from '@/components/auth/AuthInput'
import AuthPasswordInput from '@/components/auth/AuthPasswordInput'
import AuthErrorBox from '@/components/auth/AuthErrorBox'
import AuthSubmitButton from '@/components/auth/AuthSubmitButton'

const loginSchema = z.object({
  email: z.string().min(1, 'email_required').email('email_invalid'),
  password: z.string().min(1, 'password_required'),
  remember: z.boolean().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [resendEmail, setResendEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const oauthError = mapOAuthErrorParam(searchParams.get('error'))

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: false },
  })

  useEffect(() => {
    if (oauthError) {
      setFormError(
        oauthError === 'access_denied'
          ? t('errors.access_denied')
          : t('errors.oauth_error')
      )
    }
  }, [oauthError, t])

  useEffect(() => {
    if (searchParams.get('signed_out') === 'other_device') {
      setFormError(t('errors.signed_out_other_device'))
    }
  }, [searchParams, t])

  const handleResendConfirmation = async () => {
    if (!resendEmail) return
    setResending(true)
    const supabase = createClient()
    await supabase.auth.resend({
      type: 'signup',
      email: resendEmail,
    })
    setResending(false)
    setFormError(t('confirm_email_resent'))
  }

  const onSubmit = async (values: LoginForm) => {
    setLoading(true)
    setFormError(null)
    setResendEmail(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      })

      if (error) {
        const key = mapLoginError(error.message)
        if (key === 'email_not_confirmed') {
          setResendEmail(values.email.trim())
          setFormError(t('errors.email_not_confirmed'))
        } else if (key === 'invalid_credentials') {
          setFormError(t('errors.invalid_credentials'))
        } else if (key === 'rate_limit') {
          setFormError(t('errors.rate_limit'))
        } else {
          setFormError(t('errors.generic'))
        }
        setLoading(false)
        return
      }

      // Sign-in succeeded. Everything below is BEST-EFFORT bookkeeping (profile
      // sync, single-session, redirect resolution) — none of it may block or
      // fail the login. A server action running immediately after sign-in can
      // briefly not see the just-set session cookie (propagation race); that
      // used to surface as a generic error and trap the user on /login. Now we
      // swallow it and navigate — the proxy backfills claims/profile on the next
      // request, and single-session is re-asserted then too.
      // Pull the session id out of the token we JUST received — before the auth
      // cookie finishes propagating — so the server blesses THIS login rather
      // than the previous one it might still see in the cookie (BS-04 loop fix).
      const freshSessionId =
        readSessionIdFromToken(data.session?.access_token) ?? undefined

      try {
        await syncUserProfile()
      } catch {
        /* best-effort */
      }
      try {
        await establishSingleSession(freshSessionId)
      } catch {
        /* best-effort — report BS-04 */
      }

      const next = searchParams.get('next')
      let target = getDefaultWorkspacePath(locale, null)
      try {
        target = await resolvePostAuthRedirect(locale, next)
      } catch {
        /* fall back to the default workspace */
      }
      // replace() so Back never returns to the stale /login?next=… URL
      window.location.replace(target)
    } catch {
      setFormError(t('errors.generic'))
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <div className="mb-6 flex justify-center md:hidden">
        <AuthLogoMark size={32} variant="light" />
      </div>

      <div className="mb-8 text-center md:text-start">
        <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">
          {t('welcome_back')}
        </h1>
        <p className="mt-2 text-[15px] text-[#64748B]">{t('login_subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {isGoogleAuthEnabled() && (
          <>
            <GoogleAuthButton locale={locale} mode="login" />
            <OrDivider />
          </>
        )}

        <AuthInput
          label={t('email')}
          icon={Mail}
          type="email"
          placeholder={t('email_placeholder')}
          autoComplete="email"
          error={
            errors.email
              ? t(`errors.${errors.email.message as 'email_required' | 'email_invalid'}`)
              : undefined
          }
          {...register('email')}
        />

        <AuthPasswordInput
          label={t('password')}
          placeholder="••••••••"
          autoComplete="current-password"
          error={
            errors.password
              ? t('errors.password_required')
              : undefined
          }
          {...register('password')}
        />

        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#64748B]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#CBD5E1] text-[#F97316] focus:ring-[#F97316]"
              {...register('remember')}
            />
            {t('remember_me')}
          </label>
          <Link
            href={`/${locale}/forgot-password`}
            className="text-[13px] font-medium text-[#F97316] hover:underline"
          >
            {t('forgot_password')}
          </Link>
        </div>

        {formError ? (
          <AuthErrorBox
            message={formError}
            action={
              resendEmail ? (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="text-sm font-semibold text-[#F97316] hover:underline"
                >
                  {t('resend_confirmation')}
                </button>
              ) : undefined
            }
          />
        ) : null}

        <AuthSubmitButton loading={loading} loadingText={t('logging_in')}>
          {t('login_btn')}
        </AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#64748B]">
        {t('no_account')}{' '}
        <Link
          href={`/${locale}/register`}
          className="font-semibold text-[#F97316] hover:underline"
        >
          {t('create_free')}
        </Link>
      </p>
    </AuthCard>
  )
}
