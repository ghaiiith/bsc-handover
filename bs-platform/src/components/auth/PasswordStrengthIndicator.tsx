'use client'

import { useTranslations } from 'next-intl'
import {
  getPasswordStrength,
  getStrengthColor,
  getStrengthSegments,
} from '@/lib/auth/password-strength'

interface PasswordStrengthIndicatorProps {
  password: string
  visible: boolean
}

export default function PasswordStrengthIndicator({
  password,
  visible,
}: PasswordStrengthIndicatorProps) {
  const t = useTranslations('auth')

  if (!visible || !password) return null

  const strength = getPasswordStrength(password)
  const segments = getStrengthSegments(strength)
  const color = getStrengthColor(strength)

  const labelKey =
    strength === 'weak'
      ? 'strength_weak'
      : strength === 'fair'
        ? 'strength_fair'
        : strength === 'good'
          ? 'strength_good'
          : 'strength_strong'

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full bg-[#E2E8F0] transition-colors"
              style={{
                backgroundColor: i <= segments ? color : undefined,
              }}
            />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color }}>
          {t(labelKey)}
        </span>
      </div>
    </div>
  )
}
