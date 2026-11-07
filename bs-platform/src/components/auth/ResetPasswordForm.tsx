'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldCheck, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculatePasswordScore } from '@/lib/auth/password-strength'
import AuthCard from '@/components/auth/AuthCard'
import AuthPasswordInput from '@/components/auth/AuthPasswordInput'
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator'
import PasswordRequirements from '@/components/auth/PasswordRequirements'
import AuthErrorBox from '@/components/auth/AuthErrorBox'
import AuthSubmitButton from '@/components/auth/AuthSubmitButton'
import SuccessCheckmark from '@/components/auth/SuccessCheckmark'

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'password_min')
      .refine((p) => calculatePasswordScore(p) >= 2, 'password_weak'),
    confirm_password: z.string().min(1, 'password_required'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'passwords_mismatch',
    path: ['confirm_password'],
  })

type ResetForm = z.infer<typeof resetSchema>

type PageState = 'loading' | 'form' | 'success' | 'invalid'

export default function ResetPasswordForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [passwordActive, setPasswordActive] = useState(false)
  const [confirmBlurred, setConfirmBlurred] = useState(false)
  const [countdown, setCountdown] = useState(5)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const password = watch('password') ?? ''
  const confirmPassword = watch('confirm_password') ?? ''

  const confirmMatch =
    confirmPassword.length > 0
      ? password === confirmPassword
        ? 'match'
        : 'mismatch'
      : null

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (type === 'recovery' && accessToken) {
      const supabase = createClient()
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? '',
        })
        .then(({ error }) => {
          if (error) {
            setPageState('invalid')
          } else {
            setPageState('form')
            window.history.replaceState(null, '', window.location.pathname)
          }
        })
    } else {
      setPageState('invalid')
    }
  }, [])

  useEffect(() => {
    if (pageState !== 'success') return

    if (countdown <= 0) {
      router.push(`/${locale}/login`)
      return
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [pageState, countdown, locale, router])

  const onSubmit = async (values: ResetForm) => {
    setLoading(true)
    setFormError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('should be at least')) {
        setFormError(t('errors.password_min'))
      } else if (msg.includes('different from the old')) {
        setFormError(t('errors.password_same_as_old'))
      } else {
        setFormError(t('errors.generic'))
      }
      setLoading(false)
      return
    }

    setPageState('success')
    setLoading(false)
  }

  if (pageState === 'loading') {
    return (
      <AuthCard className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F97316] border-t-transparent" />
      </AuthCard>
    )
  }

  if (pageState === 'invalid') {
    return (
      <AuthCard>
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF2F2]">
            <XCircle className="h-8 w-8 text-[#EF4444]" aria-hidden />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-[28px] font-bold text-[#0F172A]">{t('invalid_link_title')}</h1>
          <p className="mt-2 text-[15px] text-[#64748B]">{t('invalid_link_subtitle')}</p>
          <p className="mt-4 text-[13px] text-[#94A3B8]">{t('link_expires')}</p>
        </div>

        <Link
          href={`/${locale}/forgot-password`}
          className="mt-8 flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F97316] text-[15px] font-bold text-white transition-colors hover:bg-[#EA6C0A]"
        >
          {t('request_new_link')}
        </Link>
      </AuthCard>
    )
  }

  if (pageState === 'success') {
    return (
      <AuthCard>
        <SuccessCheckmark className="mb-6" />

        <div className="text-center">
          <h1 className="text-[28px] font-bold text-[#0F172A]">
            {t('password_changed_title')}
          </h1>
          <p className="mt-2 text-[15px] text-[#64748B]">
            {t('password_changed_subtitle')}
          </p>
          <p className="mt-4 text-[13px] text-[#64748B]">
            {t('redirect_countdown', { seconds: countdown })}
          </p>
        </div>

        <Link
          href={`/${locale}/login`}
          className="mt-8 flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F97316] text-[15px] font-bold text-white transition-colors hover:bg-[#EA6C0A]"
        >
          {t('login_now')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <div className="mb-6 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F97316]/10">
          <ShieldCheck className="h-6 w-6 text-[#F97316]" aria-hidden />
        </div>
      </div>

      <div className="mb-8 text-center md:text-start">
        <h1 className="text-[28px] font-bold text-[#0F172A]">{t('reset_title')}</h1>
        <p className="mt-2 text-[15px] text-[#64748B]">{t('reset_subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <AuthPasswordInput
            label={t('new_password')}
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
          <PasswordRequirements
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

        {formError ? <AuthErrorBox message={formError} /> : null}

        <AuthSubmitButton loading={loading} loadingText={t('saving')}>
          {t('save_password')}
        </AuthSubmitButton>
      </form>
    </AuthCard>
  )
}
