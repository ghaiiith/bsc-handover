'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import SplitBar from '@/components/admin/SplitBar'
import { updateInstructorCommission } from '@/lib/admin/instructor-commission-actions'
import type { InstructorCommissionRow } from '@/lib/discounts/queries'

interface AdminInstructorCommissionsProps {
  locale: string
  instructors: InstructorCommissionRow[]
  defaultInstructorPct: number
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function AdminInstructorCommissions({
  locale,
  instructors,
  defaultInstructorPct,
}: AdminInstructorCommissionsProps) {
  const t = useTranslations('discounts')
  const router = useRouter()
  const isAr = locale === 'ar'

  const [drafts, setDrafts] = useState<Record<string, number>>(() =>
    Object.fromEntries(instructors.map((i) => [i.id, i.instructorPct]))
  )
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const stats = useMemo(() => {
    const custom = instructors.filter((i) => i.isCustom).length
    return {
      total: instructors.length,
      custom,
      usingDefault: instructors.length - custom,
    }
  }, [instructors])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return instructors
    return instructors.filter(
      (i) =>
        i.name.toLowerCase().includes(q) || i.nameAr.toLowerCase().includes(q)
    )
  }, [instructors, search])

  const setDraft = (id: string, value: number) => {
    if (Number.isNaN(value)) return
    setDrafts((d) => ({ ...d, [id]: Math.max(0, Math.min(100, value)) }))
  }

  const save = async (row: InstructorCommissionRow, value: number | null) => {
    if (value !== null && !Number.isFinite(value)) {
      toast.error(t('commission_invalid'))
      return
    }
    setPendingId(row.id)
    try {
      const res = await updateInstructorCommission(row.id, value, locale)
      if (res.error) {
        toast.error(t('commission_invalid'))
        return
      }
      toast.success(t('commission_saved'))
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">
          {t('instructor_commissions_title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('instructor_commissions_hint', { pct: defaultInstructorPct })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatChip label={t('stat_total_instructors')} value={stats.total} />
        <StatChip label={t('stat_custom_rates')} value={stats.custom} />
        <StatChip label={t('stat_using_default')} value={stats.usingDefault} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_instructors_placeholder')}
          className="ps-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t('no_instructors')}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const draft = drafts[row.id] ?? row.instructorPct
            const dirty = Math.round(draft) !== Math.round(row.instructorPct)
            const busy = pendingId === row.id

            return (
              <Card key={row.id} className="overflow-hidden">
                <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                  {/* Identity */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(isAr ? row.nameAr : row.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {isAr ? row.nameAr : row.name}
                        </span>
                        <span
                          className={
                            row.isCustom
                              ? 'shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
                              : 'shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                          }
                        >
                          {row.isCustom ? t('custom_rate') : t('default_rate')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('courses_count', { count: row.courseCount })}
                      </p>
                    </div>
                  </div>

                  {/* Live split preview */}
                  <div className="w-full lg:w-64">
                    <SplitBar
                      platform={100 - Math.round(draft)}
                      instructor={Math.round(draft)}
                      platformLabel={t('col_platform')}
                      instructorLabel={t('col_instructor')}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-end gap-2">
                    <div className="space-y-1">
                      <label className="block text-xs text-muted-foreground">
                        {t('col_instructor_pct')}
                      </label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={draft}
                          disabled={busy}
                          onChange={(e) => setDraft(row.id, Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && dirty) void save(row, draft)
                          }}
                          className="h-9 w-20"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="h-9"
                      variant={dirty ? 'default' : 'secondary'}
                      disabled={!dirty || busy}
                      onClick={() => void save(row, draft)}
                    >
                      {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                      {t('save')}
                    </Button>

                    {row.isCustom && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        title={t('reset_to_default')}
                        disabled={busy}
                        onClick={() => void save(row, null)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
