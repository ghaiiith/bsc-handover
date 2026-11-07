'use client'

import { useTranslations } from 'next-intl'

export default function OrDivider() {
  const t = useTranslations('auth')

  return (
    <div className="relative flex items-center py-1">
      <div className="grow border-t border-[#E2E8F0]" />
      <span className="mx-4 shrink-0 text-[13px] text-[#94A3B8]">{t('or_divider')}</span>
      <div className="grow border-t border-[#E2E8F0]" />
    </div>
  )
}
