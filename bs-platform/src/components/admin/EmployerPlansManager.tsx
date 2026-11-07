'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  createEmployerPlan,
  updateEmployerPlan,
  deleteEmployerPlan,
  type EmployerPlan,
  type EmployerPlanInput,
} from '@/lib/admin/employer-plan-actions'

interface EmployerPlansManagerProps {
  locale: string
  plans: EmployerPlan[]
}

const emptyForm: EmployerPlanInput = {
  name: '',
  name_ar: '',
  job_quota: 3,
  price: 0,
  currency: 'IQD',
  duration_days: 30,
  is_default: false,
  is_active: true,
  sort_order: 0,
  tier: null,
  description: '',
  description_ar: '',
  jobs_per_month: null,
  features: {
    ai_matching: false,
    ai_chatbot: 'limited',
    hr_chatbot: false,
    featured_jobs: false,
    email_alerts: false,
  },
  ai_limits: {},
}

// Round 9 (BS-107): the AI services an administrator can switch per plan and
// cap per month. Keys match lib/subscription/entitlements AI_SERVICES.
const AI_SERVICE_KEYS = ['ai_matching', 'hr_chatbot', 'ai_chatbot'] as const

export default function EmployerPlansManager({ locale, plans }: EmployerPlansManagerProps) {
  const t = useTranslations('employer_plans')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<EmployerPlanInput>(emptyForm)

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (p: EmployerPlan) => {
    setEditId(p.id)
    setForm({
      name: p.name,
      name_ar: p.name_ar ?? '',
      job_quota: p.job_quota,
      price: p.price,
      currency: p.currency,
      duration_days: p.duration_days,
      is_default: p.is_default,
      is_active: p.is_active,
      sort_order: p.sort_order,
      tier: p.tier ?? null,
      description: p.description ?? '',
      description_ar: p.description_ar ?? '',
      jobs_per_month: p.jobs_per_month ?? null,
      features: { ...p.features },
      ai_limits: { ...p.ai_limits },
    })
    setOpen(true)
  }

  const save = () => {
    startTransition(async () => {
      const res = editId
        ? await updateEmployerPlan(editId, form, locale)
        : await createEmployerPlan(form, locale)
      if (res.error) {
        toast.error(t('save_error'))
        return
      }
      toast.success(t('saved'))
      setOpen(false)
      router.refresh()
    })
  }

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteEmployerPlan(id, locale)
      if (res.error) toast.error(t('save_error'))
      else {
        toast.success(t('deleted'))
        router.refresh()
      }
    })
  }

  const set = (patch: Partial<EmployerPlanInput>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          {t('add_plan')}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('job_quota')}</TableHead>
            <TableHead>{t('price')}</TableHead>
            <TableHead>{t('duration')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead className="text-end">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                {t('empty')}
              </TableCell>
            </TableRow>
          ) : (
            plans.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.name}
                  {p.is_default && (
                    <Badge variant="secondary" className="ms-2">
                      {t('default')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{p.job_quota}</TableCell>
                <TableCell>
                  {p.price} {p.currency}
                </TableCell>
                <TableCell>{p.duration_days}d</TableCell>
                <TableCell>
                  <Badge className={p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-muted'}>
                    {p.is_active ? t('active') : t('inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="inline-flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? t('edit_plan') : t('add_plan')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('name_ar')}</Label>
              <Input value={form.name_ar} onChange={(e) => set({ name_ar: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('job_quota')}</Label>
              <Input
                type="number"
                min={0}
                value={form.job_quota}
                onChange={(e) => set({ job_quota: parseInt(e.target.value || '0', 10) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('price')}</Label>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set({ price: parseFloat(e.target.value || '0') })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('currency')}</Label>
              <Input value={form.currency} onChange={(e) => set({ currency: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('duration')}</Label>
              <Input
                type="number"
                min={1}
                value={form.duration_days}
                onChange={(e) => set({ duration_days: parseInt(e.target.value || '30', 10) })}
              />
            </div>
            {/* Round 9 (BS-106): the customer-facing description lives here. */}
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('description_en')}</Label>
              <textarea
                className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.description ?? ''}
                onChange={(e) => set({ description: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('description_ar')}</Label>
              <textarea
                dir="rtl"
                className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.description_ar ?? ''}
                onChange={(e) => set({ description_ar: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('tier')}</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.tier ?? ''}
                onChange={(e) =>
                  set({ tier: (e.target.value || null) as EmployerPlanInput['tier'] })
                }
              >
                <option value="">—</option>
                <option value="free">{t('tier_free')}</option>
                <option value="professional">{t('tier_professional')}</option>
                <option value="enterprise">{t('tier_enterprise')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('jobs_per_month')}</Label>
              <Input
                type="number"
                min={0}
                placeholder={t('unlimited')}
                value={form.jobs_per_month ?? ''}
                onChange={(e) =>
                  set({
                    jobs_per_month: e.target.value === '' ? null : parseInt(e.target.value, 10),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">{t('jobs_per_month_hint')}</p>
            </div>

            {/* Round 9 (BS-107): per-plan AI services + monthly caps. */}
            <div className="space-y-3 rounded-lg border p-3 sm:col-span-2">
              <p className="text-sm font-semibold">{t('ai_services')}</p>
              <div className="flex items-center justify-between">
                <Label>{t('feature_ai_matching')}</Label>
                <Switch
                  checked={Boolean(form.features?.ai_matching)}
                  onCheckedChange={(v) => set({ features: { ...form.features, ai_matching: v } })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('feature_hr_chatbot')}</Label>
                <Switch
                  checked={Boolean(form.features?.hr_chatbot)}
                  onCheckedChange={(v) => set({ features: { ...form.features, hr_chatbot: v } })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label>{t('feature_ai_chatbot')}</Label>
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={form.features?.ai_chatbot ?? 'limited'}
                  onChange={(e) =>
                    set({
                      features: {
                        ...form.features,
                        ai_chatbot: e.target.value as 'none' | 'limited' | 'full',
                      },
                    })
                  }
                >
                  <option value="none">{t('chatbot_none')}</option>
                  <option value="limited">{t('chatbot_limited')}</option>
                  <option value="full">{t('chatbot_full')}</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('feature_featured_jobs')}</Label>
                <Switch
                  checked={Boolean(form.features?.featured_jobs)}
                  onCheckedChange={(v) => set({ features: { ...form.features, featured_jobs: v } })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('feature_email_alerts')}</Label>
                <Switch
                  checked={Boolean(form.features?.email_alerts)}
                  onCheckedChange={(v) => set({ features: { ...form.features, email_alerts: v } })}
                />
              </div>

              <p className="pt-2 text-sm font-semibold">{t('ai_limits')}</p>
              <p className="text-xs text-muted-foreground">{t('ai_limits_hint')}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {AI_SERVICE_KEYS.map((svc) => (
                  <div key={svc} className="space-y-1">
                    <Label className="text-xs">{t(`limit_${svc}`)}</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder={t('unlimited')}
                      value={form.ai_limits?.[svc] ?? ''}
                      onChange={(e) =>
                        set({
                          ai_limits: {
                            ...form.ai_limits,
                            [svc]: e.target.value === '' ? null : parseInt(e.target.value, 10),
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>{t('is_default')}</Label>
              <Switch
                checked={form.is_default}
                onCheckedChange={(v) => set({ is_default: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>{t('is_active')}</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => set({ is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={save} disabled={isPending}>
              {isPending && <Loader2 className="me-2 size-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
