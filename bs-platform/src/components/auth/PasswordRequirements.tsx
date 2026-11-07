'use client'

import { useTranslations } from 'next-intl'
import { Check, X } from 'lucide-react'
import { passwordRequirements } from '@/lib/auth/password-strength'

interface PasswordRequirementsProps {
  password: string
  visible: boolean
}

export default function PasswordRequirements({
  password,
  visible,
}: PasswordRequirementsProps) {
  const t = useTranslations('auth')

  if (!visible || !password) return null

  const reqs = passwordRequirements(password)

  const items = [
    { key: 'req_8chars', met: reqs.length },
    { key: 'req_number', met: reqs.number },
    { key: 'req_uppercase', met: reqs.uppercase },
  ] as const

  return (
    <ul className="space-y-1.5 pt-1">
      {items.map(({ key, met }) => (
        <li
          key={key}
          className={`flex items-center gap-2 text-xs ${met ? 'text-[#22C55E]' : 'text-[#64748B]'}`}
        >
          {met ? (
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <X className="h-3.5 w-3.5 shrink-0 text-[#EF4444]" aria-hidden />
          )}
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  )
}
