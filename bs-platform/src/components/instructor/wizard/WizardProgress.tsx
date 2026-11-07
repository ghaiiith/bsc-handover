'use client'

import { cn } from '@/lib/utils'

const STEPS = [1, 2, 3, 4] as const

interface WizardProgressProps {
  currentStep: number
  labels: string[]
}

export default function WizardProgress({ currentStep, labels }: WizardProgressProps) {
  return (
    <div className="flex items-center justify-between gap-2 mb-8">
      {STEPS.map((step, index) => (
        <div key={step} className="flex flex-1 items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors',
              currentStep >= step
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/30 text-muted-foreground'
            )}
          >
            {step}
          </div>
          <span
            className={cn(
              'hidden sm:block text-xs font-medium truncate',
              currentStep >= step ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {labels[index]}
          </span>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                'hidden sm:block h-0.5 flex-1 mx-1',
                currentStep > step ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
