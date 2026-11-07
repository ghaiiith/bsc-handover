'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  createCourseCategory,
  toggleCourseCategory,
  updateCourseCategory,
} from '@/lib/admin/category-actions'
import type { CourseCategoryRow } from '@/lib/admin/categories'

interface AdminCategoriesManagerProps {
  locale: string
  categories: CourseCategoryRow[]
}

export default function AdminCategoriesManager({
  locale,
  categories,
}: AdminCategoriesManagerProps) {
  const t = useTranslations('categories')
  const router = useRouter()

  const [newAr, setNewAr] = useState('')
  const [newEn, setNewEn] = useState('')
  const [creating, setCreating] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<
    Record<string, { labelAr: string; labelEn: string }>
  >(() =>
    Object.fromEntries(
      categories.map((c) => [c.id, { labelAr: c.label, labelEn: c.labelEn }])
    )
  )

  const create = async () => {
    if (!newAr.trim() || !newEn.trim()) {
      toast.error(t('labels_required'))
      return
    }
    setCreating(true)
    try {
      const res = await createCourseCategory(
        { labelAr: newAr, labelEn: newEn },
        locale
      )
      if (res.error) {
        toast.error(t('save_error'))
        return
      }
      toast.success(t('created'))
      setNewAr('')
      setNewEn('')
      router.refresh()
    } finally {
      setCreating(false)
    }
  }

  const saveEdit = async (row: CourseCategoryRow) => {
    const draft = drafts[row.id]
    if (!draft?.labelAr.trim() || !draft?.labelEn.trim()) {
      toast.error(t('labels_required'))
      return
    }
    setPendingId(row.id)
    try {
      const res = await updateCourseCategory(
        row.id,
        { labelAr: draft.labelAr, labelEn: draft.labelEn },
        locale
      )
      if (res.error) {
        toast.error(t('save_error'))
        return
      }
      toast.success(t('saved'))
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  const toggle = async (row: CourseCategoryRow, next: boolean) => {
    setPendingId(row.id)
    try {
      const res = await toggleCourseCategory(row.id, next, locale)
      if (res.error) {
        toast.error(t('save_error'))
        return
      }
      toast.success(next ? t('activated') : t('deactivated'))
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add new */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <h3 className="font-semibold">{t('add_new')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('label_ar')}</Label>
              <Input
                value={newAr}
                onChange={(e) => setNewAr(e.target.value)}
                placeholder={t('label_ar_placeholder')}
                dir="rtl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t('label_en')}</Label>
              <Input
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                placeholder={t('label_en_placeholder')}
                dir="ltr"
              />
            </div>
          </div>
          <Button disabled={creating} onClick={() => void create()}>
            {creating ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="me-2 h-4 w-4" />
            )}
            {t('add_new')}
          </Button>
        </CardContent>
      </Card>

      {/* Existing */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t('existing')}</h3>
        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          categories.map((row) => {
            const draft = drafts[row.id] ?? {
              labelAr: row.label,
              labelEn: row.labelEn,
            }
            const dirty =
              draft.labelAr !== row.label || draft.labelEn !== row.labelEn
            const busy = pendingId === row.id

            return (
              <Card key={row.id} className={row.isActive ? '' : 'opacity-70'}>
                <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t('label_ar')}
                    </Label>
                    <Input
                      value={draft.labelAr}
                      dir="rtl"
                      disabled={busy}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [row.id]: { ...draft, labelAr: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t('label_en')}
                    </Label>
                    <Input
                      value={draft.labelEn}
                      dir="ltr"
                      disabled={busy}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [row.id]: { ...draft, labelEn: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {t('slug')}
                    </Label>
                    <code className="block rounded-md bg-muted px-2 py-2 text-xs">
                      {row.value}
                    </code>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.isActive}
                        disabled={busy}
                        onCheckedChange={(v) => void toggle(row, v)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {row.isActive ? t('active') : t('inactive')}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={dirty ? 'default' : 'secondary'}
                      disabled={!dirty || busy}
                      onClick={() => void saveEdit(row)}
                    >
                      {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                      {t('save')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
