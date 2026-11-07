'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { syncUserProfile } from '@/lib/auth/actions'
import { establishSingleSession } from '@/lib/auth/session-actions'
import { resolvePostAuthRedirect } from '@/lib/onboarding/post-auth-redirect'
import AuthCard from '@/components/auth/AuthCard'
import ResendCountdownButton from '@/components/auth/ResendCountdownButton'
import AuthSubmitButton from '@/components/auth/AuthSubmitButton'

export default function VerifyEmailForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResend = async () => {
    if (!email) return
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
  }

  // Report BS-41: manual code fallback — the confirmation email carries a
  // 6-digit code; verifying it here establishes the session just like the link.
  const handleVerifyCode = async () => {
    const token = code.trim()
    if (!email || token.length < 6 || verifying) return
    setVerifying(true)
    setError(null)
    try {
      const supabase = createClient()
      // GoTrue accepts the signup-confirmation code under either the generic
      // 'email' type or the legacy 'signup' type depending on version — try both.
      let ok = false
      for (const type of ['email', 'signup'] as const) {
        const { error: otpError } = await supabase.auth.verifyOtp({ email, token, type })
        if (!otpError) {
          ok = true
          break
        }
      }
      if (!ok) {
        setError(t('verify_code_invalid'))
        setVerifying(false)
        return
      }

      await syncUserProfile()
      await establishSingleSession()

      const target = await resolvePostAuthRedirect(locale, null)
      toast.success(t('verify_code_success'))
      window.location.replace(target)
    } catch {
      setError(t('verify_code_invalid'))
      setVerifying(false)
    }
  }

  const steps = [t('verify_step_1'), t('verify_step_2'), t('verify_step_3')]

  return (
    <AuthCard>
      <div className="mb-6 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F97316]/10">
          <Mail className="h-6 w-6 text-[#F97316]" aria-hidden />
        </div>
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-[28px] font-bold text-[#0F172A]">{t('verify_title')}</h1>
        <p className="mt-2 text-[15px] text-[#64748B]">{t('verify_subtitle')}</p>
        {email ? (
          <p className="mt-3 text-[15px] font-semibold text-[#0F172A]">{email}</p>
        ) : null}
      </div>

      {/* Report BS-41: paste-the-code fallback when the link can't be used. */}
      {email ? (
        <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <label className="block text-center text-[13px] font-medium text-[#0F172A]">
            {t('verify_code_label')}
          </label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleVerifyCode()
            }}
            placeholder="••••••"
            className="num-en mx-auto mt-3 block w-40 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-center text-2xl font-bold tracking-[0.4em] text-[#0F172A] focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
          />
          {error ? (
            <p className="mt-2 text-center text-[13px] text-red-600">{error}</p>
          ) : null}
          <div className="mt-3">
            <AuthSubmitButton
              type="button"
              loading={verifying}
              loadingText={t('verify_code_verifying')}
              onClick={() => void handleVerifyCode()}
              disabled={code.length < 6}
            >
              {t('verify_code_button')}
            </AuthSubmitButton>
          </div>
        </div>
      ) : null}

      <ol className="space-y-3 text-[14px] text-[#64748B]">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F97316]/10 text-xs font-bold text-[#F97316]">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 space-y-4 text-center">
        <p className="text-[13px] text-[#64748B]">{t('verify_no_email')}</p>
        <ul className="text-[13px] text-[#64748B]">
          <li>{t('check_spam')}</li>
        </ul>
        {email ? <ResendCountdownButton onResend={handleResend} className="mx-auto" /> : null}
        <Link
          href={`/${locale}/register`}
          className="block text-[13px] font-medium text-[#F97316] hover:underline"
        >
          {t('change_email')}
        </Link>
      </div>
    </AuthCard>
  )
}
