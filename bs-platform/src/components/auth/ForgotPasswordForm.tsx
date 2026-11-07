'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Lock, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getAppUrl } from '@/lib/seo/metadata'
import AuthCard from '@/components/auth/AuthCard'
import AuthInput from '@/components/auth/AuthInput'
import AuthSubmitButton from '@/components/auth/AuthSubmitButton'
import SuccessCheckmark from '@/components/auth/SuccessCheckmark'
import ResendCountdownButton from '@/components/auth/ResendCountdownButton'

const forgotSchema = z.object({
  email: z.string().min(1, 'email_required').email('email_invalid'),
})

type ForgotForm = z.infer<typeof forgotSchema>

export default function ForgotPasswordForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const sendResetEmail = async (email: string) => {
    const supabase = createClient()
    const appUrl = getAppUrl()

    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${appUrl}/${locale}/reset-password`,
    })
  }

  const onSubmit = async (values: ForgotForm) => {
    setLoading(true)
    await sendResetEmail(values.email)
    setSubmittedEmail(values.email.trim())
    setSent(true)
    setLoading(false)
  }

  const handleResend = async () => {
    if (submittedEmail) {
      await sendResetEmail(submittedEmail)
    }
  }

  if (sent) {
    return (
      <AuthCard>
        <SuccessCheckmark className="mb-6" />

        <div className="text-center">
          <h1 className="text-[28px] font-bold text-[#0F172A]">{t('link_sent_title')}</h1>
          <p className="mt-2 text-[15px] text-[#64748B]">{t('link_sent_subtitle')}</p>
          <p className="mt-4 text-[13px] text-[#94A3B8]">
            {t('verified_email')}: <strong className="text-[#64748B]">{submittedEmail}</strong>
          </p>
        </div>

        <div className="mt-6 flex gap-3 rounded-lg bg-[#EFF6FF] px-4 py-3 text-sm text-[#64748B]">
          <span aria-hidden>ℹ️</span>
          <p>{t('check_spam')}</p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <ResendCountdownButton onResend={handleResend} />
          <Link
            href={`/${locale}/login`}
            className="text-[13px] font-medium text-[#F97316] hover:underline"
          >
            {t('back_to_login')}
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <Link
        href={`/${locale}/login`}
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('back')}
      </Link>

      <div className="mb-6 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F97316]/10">
          <Lock className="h-6 w-6 text-[#F97316]" aria-hidden />
        </div>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-bold text-[#0F172A]">{t('forgot_title')}</h1>
        <p className="mt-2 text-[15px] text-[#64748B]">{t('forgot_subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <AuthInput
          label={t('email')}
          icon={Mail}
          type="email"
          placeholder={t('email_placeholder')}
          autoComplete="email"
          autoFocus
          error={
            errors.email
              ? t(`errors.${errors.email.message as 'email_required' | 'email_invalid'}`)
              : undefined
          }
          {...register('email')}
        />

        <AuthSubmitButton loading={loading} loadingText={t('sending')}>
          {t('send_reset_link')}
        </AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#64748B]">
        {t('remember_password')}{' '}
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
