'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  resetCompanyFreeMonthsUsage,
  searchCompaniesForFreeMonths,
  setCompanyFreeMonths,
  updatePlatformFreeMonths,
  type CompanyFreeMonths,
} from '@/lib/admin/employer-plan-actions'

interface FreeMonthsPanelProps {
  locale: string
  platformFreeMonths: string
}

/** Report BS-38: grant free subscription months platform-wide or per company. */
export default function FreeMonthsPanel({ locale, platformFreeMonths }: FreeMonthsPanelProps) {
  const t = useTranslations('employer_plans')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [months, setMonths] = useState(platformFreeMonths)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CompanyFreeMonths[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const run = (fn: () => Promise<{ success?: boolean; error?: string }>, msg: string) => {
    startTransition(async () => {
      const result = await fn()
      if (!result.success) {
        toast.error(t('free_months_error'))
        return
      }
      toast.success(msg)
      router.refresh()
    })
  }

  const search = () => {
    startTransition(async () => {
      const found = await searchCompaniesForFreeMonths(query)
      setResults(found)
      setDrafts(
        Object.fromEntries(
          found.map((c) => [c.id, c.free_subscription_months?.toString() ?? ''])
        )
      )
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('free_months_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t('free_months_platform')}</Label>
          <p className="text-sm text-muted-foreground">{t('free_months_hint')}</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={60}
              className="num-en max-w-[120px]"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
            />
            <Button
              disabled={isPending}
              onClick={() =>
                run(
                  () => updatePlatformFreeMonths(parseInt(months || '0', 10), locale),
                  t('free_months_saved')
                )
              }
            >
              {tCommon('save')}
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>{t('free_months_company')}</Label>
          <p className="text-sm text-muted-foreground">{t('free_months_company_hint')}</p>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('free_months_search')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') search()
              }}
            />
            <Button variant="outline" disabled={isPending} onClick={search}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            {results.map((company) => (
              <div
                key={company.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{company.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{company.email}</p>
                  <p className="num-en text-xs text-muted-foreground">
                    {t('free_months_used', { count: company.free_subscription_months_used })}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  className="num-en w-20"
                  placeholder="—"
                  value={drafts[company.id] ?? ''}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [company.id]: e.target.value }))
                  }
                />
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    const raw = drafts[company.id]?.trim()
                    run(
                      () =>
                        setCompanyFreeMonths(
                          company.id,
                          raw === '' || raw === undefined ? null : parseInt(raw, 10),
                          locale
                        ),
                      t('free_months_saved')
                    )
                  }}
                >
                  {tCommon('save')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title={t('free_months_reset')}
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () => resetCompanyFreeMonthsUsage(company.id, locale),
                      t('free_months_saved')
                    )
                  }
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
