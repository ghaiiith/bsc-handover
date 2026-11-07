'use client'

import { forwardRef, useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface AuthPasswordInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label: string
  error?: string
  matchIcon?: 'match' | 'mismatch' | null
  onUserInput?: () => void
}

const AuthPasswordInput = forwardRef<HTMLInputElement, AuthPasswordInputProps>(
  ({ label, error, matchIcon, onUserInput, className, id, ...props }, ref) => {
    const t = useTranslations('auth')
    const [showPassword, setShowPassword] = useState(false)
    const [focused, setFocused] = useState(false)
    const inputId = id ?? props.name

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-[#374151]"
        >
          {label}
        </label>
        <div className="relative">
          <Lock
            className={cn(
              'pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
              error || matchIcon === 'mismatch'
                ? 'text-[#EF4444]'
                : focused
                  ? 'text-[#F97316]'
                  : 'text-[#94A3B8]'
            )}
            aria-hidden
          />
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onFocus={(e) => {
              setFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              props.onBlur?.(e)
            }}
            onInput={(e) => {
              onUserInput?.()
              props.onInput?.(e)
            }}
            className={cn(
              'h-12 w-full rounded-[10px] border bg-[#F8FAFC] ps-10 pe-20 text-[15px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F97316]/20',
              error || matchIcon === 'mismatch'
                ? 'border-[#EF4444] focus:border-[#EF4444]'
                : 'border-[#CBD5E1] focus:border-[#F97316]',
              className
            )}
            {...props}
          />
          <div className="absolute end-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {matchIcon === 'match' ? (
              <span className="text-sm text-[#22C55E]" aria-hidden>
                ✓
              </span>
            ) : null}
            {matchIcon === 'mismatch' ? (
              <span className="text-sm text-[#EF4444]" aria-hidden>
                ✕
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="rounded p-1 text-[#94A3B8] transition-colors hover:text-[#64748B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
              aria-label={showPassword ? t('hide_password') : t('show_password')}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-[#EF4444]">
            {error}
          </p>
        ) : null}
      </div>
    )
  }
)

AuthPasswordInput.displayName = 'AuthPasswordInput'

export default AuthPasswordInput
