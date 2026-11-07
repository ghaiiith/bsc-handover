import Link from 'next/link'
import { Clock } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RolePendingBannerProps {
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  detail?: string
  steps?: string[]
}

export default function RolePendingBanner({
  title,
  description,
  ctaLabel,
  ctaHref,
  detail,
  steps,
}: RolePendingBannerProps) {
  return (
    <div className="rounded-xl border border-[#E57D17]/30 bg-[#E57D17]/5 p-5">
      <div className="flex gap-3">
        <Clock className="mt-0.5 size-5 shrink-0 text-[#E57D17]" />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
          {detail ? (
            <p className="text-sm font-medium text-foreground">{detail}</p>
          ) : null}
          {steps && steps.length > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {steps.map((step) => (
                <li key={step}>• {step}</li>
              ))}
            </ul>
          ) : null}
          <Link
            href={ctaHref}
            className={cn(
              buttonVariants({ variant: 'default', size: 'sm' }),
              'mt-2 inline-flex bg-[#E57D17] hover:bg-[#CC6F14]'
            )}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
