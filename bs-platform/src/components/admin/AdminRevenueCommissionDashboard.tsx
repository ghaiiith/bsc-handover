'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, Plus, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createOrReplaceRevenueAgreement,
  fetchAgreementHistory,
} from '@/lib/admin/revenue-agreement-actions'
import { previewRevenueBreakdown } from '@/lib/revenue/preview-breakdown'
import type { InstructorRevenueAgreement } from '@/lib/revenue/types'

interface AgreementRow {
  instructor_id: string
  instructor_name: string
  instructor_name_ar: string | null
  instructor_email: string
  platform_percentage: number
  instructor_percentage: number
  effective_date: string
  notes: string | null
}

interface GatewayRow {
  gateway_id: string
  display_name: string
  gateway_type: string
  percentage_fee: number
  fixed_fee: number
  currency: string
  enabled: boolean
}

export default function AdminRevenueCommissionDashboard() {
  const locale = useLocale()
  const t = useTranslations('revenue_admin')
  const [agreements, setAgreements] = useState<AgreementRow[]>([])
  const [gateways, setGateways] = useState<GatewayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<AgreementRow | null>(null)
  const [platformPct, setPlatformPct] = useState(30)
  const [notes, setNotes] = useState('')
  const [history, setHistory] = useState<InstructorRevenueAgreement[]>([])
  const [pending, startTransition] = useTransition()

  const instructorPct = 100 - platformPct

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/revenue-commission')
      const data = (await res.json()) as {
        agreements: AgreementRow[]
        gateways: GatewayRow[]
      }
      setAgreements(data.agreements ?? [])
      setGateways(data.gateways ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = agreements.filter((a) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      a.instructor_name.toLowerCase().includes(q) ||
      (a.instructor_name_ar?.toLowerCase().includes(q) ?? false) ||
      a.instructor_email.toLowerCase().includes(q)
    )
  })

  const openEdit = async (row: AgreementRow) => {
    setSelected(row)
    setPlatformPct(row.platform_percentage)
    setNotes(row.notes ?? '')
    const hist = await fetchAgreementHistory(row.instructor_id)
    setHistory(hist)
    setEditOpen(true)
  }

  const saveAgreement = () => {
    if (!selected) return
    startTransition(async () => {
      const result = await createOrReplaceRevenueAgreement(
        selected.instructor_id,
        platformPct,
        instructorPct,
        notes || null,
        locale
      )
      if (!result.success) {
        toast.error(t('save_error'))
        return
      }
      toast.success(t('saved'))
      setEditOpen(false)
      await load()
    })
  }

  const localGateway = gateways.find((g) => g.gateway_id === 'zaincash' && g.enabled)
  const preview = previewRevenueBreakdown({
    coursePrice: 20000,
    platformPercentage: platformPct,
    instructorPercentage: instructorPct,
    gatewayPercentage: localGateway?.percentage_fee ?? 2.5,
    gatewayFixedFee: localGateway?.fixed_fee ?? 600,
  })

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => void load()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> {t('refresh')}
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <h3 className="font-semibold">{t('gateway_fees')}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gateways.filter((g) => g.enabled).map((g) => (
              <div key={g.gateway_id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{g.display_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{g.gateway_type}</p>
                <p className="mt-1">
                  {g.percentage_fee}% + {g.fixed_fee} {g.currency}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-9"
          placeholder={t('search_instructors')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((row) => (
          <Card key={row.instructor_id}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{row.instructor_name}</h3>
                  <p className="text-xs text-muted-foreground">{row.instructor_email}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void openEdit(row)}>
                  {t('edit')}
                </Button>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">{t('platform_share')}</dt>
                  <dd>{row.platform_percentage}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">{t('instructor_share')}</dt>
                  <dd>{row.instructor_percentage}%</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground text-xs">{t('effective_date')}</dt>
                  <dd>{new Date(row.effective_date).toLocaleDateString()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('no_agreements')}</p>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('edit_agreement')}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{selected.instructor_name}</p>
              <div className="space-y-2">
                <Label>{t('platform_share')} (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={platformPct}
                  onChange={(e) => setPlatformPct(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {t('instructor_share')}: {instructorPct}%
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('notes')}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium mb-2">{t('preview_example')}</p>
                <dl className="grid grid-cols-2 gap-1 text-xs">
                  <dt>{t('course_price')}</dt>
                  <dd>20,000 IQD</dd>
                  <dt>{t('gateway_fee')}</dt>
                  <dd>{preview.gatewayTotalFee.toLocaleString()} IQD</dd>
                  <dt>{t('net_received')}</dt>
                  <dd>{preview.netReceivedAmount.toLocaleString()} IQD</dd>
                  <dt>{t('platform_revenue')}</dt>
                  <dd>{preview.platformRevenue.toLocaleString()} IQD</dd>
                  <dt>{t('instructor_revenue')}</dt>
                  <dd>{preview.instructorRevenue.toLocaleString()} IQD</dd>
                </dl>
              </div>
              {history.length > 1 && (
                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  <p className="font-medium">{t('history')}</p>
                  {history.slice(1).map((h) => (
                    <p key={h.id} className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString()} — Platform {h.platform_percentage}% / Instructor {h.instructor_percentage}%
                    </p>
                  ))}
                </div>
              )}
              <Button disabled={pending || platformPct + instructorPct !== 100} onClick={saveAgreement}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save_agreement')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
