'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
import {
  createCommunityCategory,
  updateCommunityCategory,
  deleteCommunityCategory,
  type CommunityCategoryRow,
  type CommunityCategoryInput,
} from '@/lib/admin/community-category-actions'

interface Props {
  locale: string
  categories: CommunityCategoryRow[]
}

const empty: CommunityCategoryInput = {
  value: '',
  label_ar: '',
  label_en: '',
  emoji: '',
  keywords: [],
  sort_order: 0,
  is_active: true,
}

export default function CommunityCategoriesManager({ locale, categories }: Props) {
  const t = useTranslations('community_categories')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [editValue, setEditValue] = useState<string | null>(null)
  const [form, setForm] = useState<CommunityCategoryInput>(empty)
  const [keywordsText, setKeywordsText] = useState('')

  const openCreate = () => {
    setEditValue(null)
    setForm(empty)
    setKeywordsText('')
    setOpen(true)
  }

  const openEdit = (c: CommunityCategoryRow) => {
    setEditValue(c.value)
    setForm({
      value: c.value,
      label_ar: c.label_ar,
      label_en: c.label_en,
      emoji: c.emoji,
      keywords: c.keywords,
      sort_order: c.sort_order,
      is_active: c.is_active,
    })
    setKeywordsText(c.keywords.join(', '))
    setOpen(true)
  }

  const save = () => {
    const keywords = keywordsText
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean)
    const payload = { ...form, keywords }
    startTransition(async () => {
      const res = editValue
        ? await updateCommunityCategory(editValue, payload, locale)
        : await createCommunityCategory(payload, locale)
      if (res.error) {
        toast.error(res.error === 'value_taken' ? t('value_taken') : t('save_error'))
        return
      }
      toast.success(t('saved'))
      setOpen(false)
      router.refresh()
    })
  }

  const remove = (value: string) => {
    startTransition(async () => {
      const res = await deleteCommunityCategory(value, locale)
      if (res.error) toast.error(t('save_error'))
      else {
        toast.success(t('deleted'))
        router.refresh()
      }
    })
  }

  const set = (patch: Partial<CommunityCategoryInput>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          {t('add')}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('category')}</TableHead>
            <TableHead>{t('value')}</TableHead>
            <TableHead>{t('keywords')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead className="text-end">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                {t('empty')}
              </TableCell>
            </TableRow>
          ) : (
            categories.map((c) => (
              <TableRow key={c.value}>
                <TableCell className="font-medium">
                  {c.emoji} {c.label_en} / {c.label_ar}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.value}</TableCell>
                <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                  {c.keywords.slice(0, 6).join(', ')}
                  {c.keywords.length > 6 ? '…' : ''}
                </TableCell>
                <TableCell>
                  <Badge className={c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-muted'}>
                    {c.is_active ? t('active') : t('inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="inline-flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={isPending} onClick={() => remove(c.value)}>
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
            <DialogTitle>{editValue ? t('edit') : t('add')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('label_en')}</Label>
              <Input value={form.label_en} onChange={(e) => set({ label_en: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('label_ar')}</Label>
              <Input value={form.label_ar} onChange={(e) => set({ label_ar: e.target.value })} dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>{t('emoji')}</Label>
              <Input value={form.emoji} onChange={(e) => set({ emoji: e.target.value })} maxLength={4} />
            </div>
            <div className="space-y-2">
              <Label>{t('value')}</Label>
              <Input
                value={form.value}
                onChange={(e) => set({ value: e.target.value })}
                disabled={Boolean(editValue)}
                placeholder="e.g. programming"
                className="num-en"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('keywords')}</Label>
              <Textarea
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                rows={3}
                placeholder={t('keywords_ph')}
              />
              <p className="text-xs text-muted-foreground">{t('keywords_hint')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('sort_order')}</Label>
              <Input
                type="number"
                value={form.sort_order ?? 0}
                onChange={(e) => set({ sort_order: parseInt(e.target.value || '0', 10) })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>{t('active')}</Label>
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
