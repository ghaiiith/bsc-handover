'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DiscountPercentSliderProps {
  id?: string
  label: string
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
}

export default function DiscountPercentSlider({
  id = 'discount-percent',
  label,
  value,
  min = 1,
  max,
  onChange,
  disabled,
}: DiscountPercentSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-lg font-semibold tabular-nums text-primary">
          {value}%
        </span>
      </div>
      <Input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      {/* Report BS-57: end labels are the real bounds of the track — 0% on the
          left and the party's actual cap (e.g. 70%) on the right, not a broken
          "1%". */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>{max}%</span>
      </div>
    </div>
  )
}
