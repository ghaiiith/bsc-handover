'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { saveAcademySeatTiers } from '@/lib/admin/admin-settings-actions'
import type { SeatTier } from '@/lib/company/academy-pricing'

/**
 * Report BS-70/80: seat tiers and their discounts are configured HERE by the
 * administrator instead of being fixed in code / hand-edited in the database.
 */
export default function AcademyTiersManager({ initial }: { initial: SeatTier[] }) {
  const t = useTranslations('admin_homepage')
  const locale = useLocale()
  const [tiers, setTiers] = useState<SeatTier[]>(initial)
  const [pending, startTransition] = useTransition()

  const patch = (i: number, p: Partial<SeatTier>) =>
    setTiers((x) => x.map((y, j) => (j === i ? { ...y, ...p } : y)))

  const save = () =>
    startTransition(async () => {
      const res = await saveAcademySeatTiers(tiers, locale)
      if (res.success) toast.success(t('saved'))
      else toast.error(res.error === 'invalid_tier' ? t('tier_invalid') : t('save_failed'))
    })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{t('tiers_title')}</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setTiers((x) => [...x, { minSeats: 5, discountPct: 10 }])}
        >
          <Plus className="me-1 h-4 w-4" />
          {t('tier_add')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('tiers_hint')}</p>
        {tiers.length === 0 && <p className="text-sm text-muted-foreground">{t('tiers_empty')}</p>}
        {tiers.map((tier, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('tier_min_seats')}</Label>
              <Input
                type="number"
                min={1}
                className="w-28"
                value={tier.minSeats}
                onChange={(e) => patch(i, { minSeats: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('tier_discount')}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                className="w-28"
                value={tier.discountPct}
                onChange={(e) =>
                  patch(i, {
                    discountPct: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                  })
                }
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-destructive"
              onClick={() => setTiers((x) => x.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" disabled={pending} onClick={save}>
          {t('save')}
        </Button>
      </CardContent>
    </Card>
  )
}
