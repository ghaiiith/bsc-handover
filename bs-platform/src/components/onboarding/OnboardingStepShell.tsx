'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import BrandLogo from '@/components/brand/BrandLogo'

interface OnboardingStepShellProps {
  step: number
  totalSteps: number
  title: string
  subtitle?: string
  children: ReactNode
  footer: ReactNode
  headerAction?: ReactNode
}

export default function OnboardingStepShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  footer,
  headerAction,
}: OnboardingStepShellProps) {
  const t = useTranslations('onboarding_flow')
  const progress = Math.round((step / totalSteps) * 100)

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-3">
          <BrandLogo mode="compact" iconSize={28} />
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {t('step_progress', { step, total: totalSteps })}
            </span>
            {headerAction}
          </div>
        </div>
        <div className="mx-auto mt-3 h-1.5 w-full max-w-[480px] overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#E57D17] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex-1 space-y-3">{children}</div>
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto w-full max-w-[480px]">{footer}</div>
      </footer>
    </div>
  )
}
