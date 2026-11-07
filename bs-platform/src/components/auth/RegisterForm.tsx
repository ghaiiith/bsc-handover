'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, User } from 'lucide-react'
import { registerUser, type RegisterErrorCode } from '@/lib/auth/register-actions'
import { resolvePostAuthRedirect } from '@/lib/onboarding/post-auth-redirect'
import { calculatePasswordScore } from '@/lib/auth/password-strength'
import { useEmailAvailability } from '@/hooks/useEmailAvailability'
import AuthCard from '@/components/auth/AuthCard'
import AuthLogoMark from '@/components/auth/AuthLogoMark'
import GoogleAuthButton from '@/components/auth/GoogleAuthButton'
import { isGoogleAuthEnabled } from '@/lib/auth/oauth-providers'
import OrDivider from '@/components/auth/OrDivider'
import AuthInput from '@/components/auth/AuthInput'
import AuthPasswordInput from '@/components/auth/AuthPasswordInput'
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator'
import AuthErrorBox from '@/components/auth/AuthErrorBox'
import AuthSubmitButton from '@/components/auth/AuthSubmitButton'

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'name_required').max(60, 'name_too_long'),
    email: z.string().min(1, 'email_required').email('email_invalid'),
    password: z
      .string()
      .min(8, 'password_min')
      .refine((p) => calculatePasswordScore(p) >= 2, 'password_weak'),
    confirm_password: z.string().min(1, 'password_required'),
    terms: z.boolean().refine((v) => v === true, {
      message: 'terms_required',
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'passwords_mismatch',
    path: ['confirm_password'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [passwordActive, setPasswordActive] = useState(false)
  const [confirmBlurred, setConfirmBlurred] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: false },
  })

  const email = watch('email') ?? ''
  const password = watch('password') ?? ''
  const confirmPassword = watch('confirm_password') ?? ''

  const { available: emailAvailable, hint: emailHint } = useEmailAvailability(
    email,
    locale
  )

  const confirmMatch =
    confirmPassword.length > 0
      ? password === confirmPassword
        ? 'match'
        : 'mismatch'
      : null

  const showRegisterError = (code: RegisterErrorCode) => {
    const key = `errors.${code}` as const
    setFormError(t.has(key) ? t(key) : t('errors.register_failed'))
  }

  const onSubmit = async (values: RegisterForm) => {
    if (emailAvailable === false) {
      setFormError(t('email_taken'))
      return
    }

    setLoading(true)
    setFormError(null)

    const result = await registerUser({
      email: values.email,
      password: values.password,
      fullName: values.full_name,
      locale,
    })

    if (result.error) {
      showRegisterError(result.error)
      setLoading(false)
      return
    }

    if (result.needsEmailConfirmation) {
      router.push(
        `/${locale}/verify-email?email=${encodeURIComponent(values.email)}`
      )
      setLoading(false)
      return
    }

    if (result.userId) {
      void fetch('/api/auth/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: result.userId, locale }),
      })
    }

    const target = await resolvePostAuthRedirect(locale, null)
    window.location.replace(target)
  }

  return (
    <AuthCard>
      <div className="mb-6 flex justify-center md:hidden">
        <AuthLogoMark size={32} variant="light" />
      </div>

      <div className="mb-8 text-center md:text-start">
        <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">
          {t('register_title')}
        </h1>
        <p className="mt-2 text-[15px] text-[#64748B]">{t('register_subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {isGoogleAuthEnabled() && (
          <>
            <GoogleAuthButton locale={locale} mode="register" />
            <OrDivider />
          </>
        )}

        <AuthInput
          label={t('full_name')}
          icon={User}
          placeholder={t('name_placeholder')}
          autoComplete="name"
          error={
            errors.full_name
              ? t(
                  `errors.${errors.full_name.message as 'name_required' | 'name_too_long'}`
                )
              : undefined
          }
          {...register('full_name')}
        />

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
          hint={emailHint()}
          {...register('email')}
        />

        <div>
          <AuthPasswordInput
            label={t('password')}
            placeholder="••••••••"
            autoComplete="new-password"
            onUserInput={() => setPasswordActive(true)}
            error={
              errors.password
                ? t(
                    `errors.${errors.password.message as 'password_min' | 'password_weak'}`
                  )
                : undefined
            }
            {...register('password')}
          />
          <PasswordStrengthIndicator
            password={password}
            visible={passwordActive && password.length > 0}
          />
        </div>

        <AuthPasswordInput
          label={t('confirm_password')}
          placeholder="••••••••"
          autoComplete="new-password"
          matchIcon={
            confirmPassword.length > 0
              ? confirmBlurred
                ? confirmMatch
                : confirmMatch === 'match'
                  ? 'match'
                  : null
              : null
          }
          error={
            confirmBlurred && confirmMatch === 'mismatch'
              ? t('errors.passwords_mismatch')
              : errors.confirm_password
                ? t('errors.passwords_mismatch')
                : undefined
          }
          {...register('confirm_password', {
            onBlur: () => setConfirmBlurred(true),
          })}
        />

        <div className="space-y-1">
          <label className="flex cursor-pointer items-start gap-2 text-[13px] text-[#64748B]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#CBD5E1] text-[#F97316] focus:ring-[#F97316]"
              {...register('terms')}
            />
            <span>
              {t('terms_agree')}{' '}
              <a
                href={`/${locale}/terms`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#F97316] hover:underline"
              >
                {t('terms_link')}
              </a>{' '}
              {locale === 'ar' ? 'و' : 'and'}{' '}
              <a
                href={`/${locale}/privacy`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#F97316] hover:underline"
              >
                {t('privacy_link')}
              </a>
            </span>
          </label>
          {errors.terms ? (
            <p className="text-xs text-[#EF4444]">{t('errors.terms_required')}</p>
          ) : null}
        </div>

        {formError ? <AuthErrorBox message={formError} /> : null}

        <AuthSubmitButton loading={loading} loadingText={t('creating_account')}>
          {t('register_btn')}
        </AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#64748B]">
        {t('have_account')}{' '}
        <Link
          href={`/${locale}/login`}
          className="font-semibold text-[#F97316] hover:underline"
        >
          {t('login_btn')}
        </Link>
      </p>
    </AuthCard>
  )
}
