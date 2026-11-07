'use client'

import { forwardRef, useState } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: LucideIcon
  error?: string
  hint?: React.ReactNode
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon: Icon, error, hint, className, id, ...props }, ref) => {
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
          <Icon
            className={cn(
              'pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
              error ? 'text-[#EF4444]' : focused ? 'text-[#F97316]' : 'text-[#94A3B8]'
            )}
            aria-hidden
          />
          <input
            ref={ref}
            id={inputId}
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
            className={cn(
              'h-12 w-full rounded-[10px] border bg-[#F8FAFC] ps-10 pe-4 text-[15px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F97316]/20',
              error
                ? 'border-[#EF4444] focus:border-[#EF4444]'
                : 'border-[#CBD5E1] focus:border-[#F97316]',
              className
            )}
            {...props}
          />
        </div>
        {hint}
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-[#EF4444]">
            {error}
          </p>
        ) : null}
      </div>
    )
  }
)

AuthInput.displayName = 'AuthInput'

export default AuthInput
