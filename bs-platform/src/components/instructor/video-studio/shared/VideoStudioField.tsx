import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface VideoStudioFieldProps {
  label: string
  value: ReactNode
  mono?: boolean
}

export default function VideoStudioField({ label, value, mono }: VideoStudioFieldProps) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm', mono && 'font-mono text-xs break-all')}>{value}</dd>
    </div>
  )
}
