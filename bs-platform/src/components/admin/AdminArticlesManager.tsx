'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  deleteArticle,
  saveArticle,
  setArticleStatus,
  type Article,
  type ArticleInput,
} from '@/lib/articles/article-actions'
import { formatDate } from '@/lib/utils'

const empty: ArticleInput = {
  title: '',
  title_ar: '',
  slug: '',
  summary: '',
  summary_ar: '',
  body: '',
  body_ar: '',
  cover_image_url: '',
}

function autoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
}

/**
 * Round 9 (BS-105): create / edit / publish / unpublish / delete articles.
 * The body is Markdown-lite (see lib/articles/render-body) — safe by
 * construction, so no rich-text editor is needed to keep the public page clean.
 */
export default function AdminArticlesManager({ locale, articles }: { locale: string; articles: Article[] }) {
  const t = useTranslations('admin_articles')
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ArticleInput>(empty)
  const [slugTouched, setSlugTouched] = useState(false)
  const set = (p: Partial<ArticleInput>) => setForm((f) => ({ ...f, ...p }))

  const openNew = () => {
    setEditId(null)
    setForm(empty)
    setSlugTouched(false)
    setOpen(true)
  }
  const openEdit = (a: Article) => {
    setEditId(a.id)
    setForm({
      title: a.title,
      title_ar: a.title_ar ?? '',
      slug: a.slug,
      summary: a.summary ?? '',
      summary_ar: a.summary_ar ?? '',
      body: a.body,
      body_ar: a.body_ar ?? '',
      cover_image_url: a.cover_image_url ?? '',
    })
    setSlugTouched(true)
    setOpen(true)
  }

  const save = () =>
    start(async () => {
      const res = await saveArticle(form, locale, editId ?? undefined)
      if (res.error) {
        toast.error(res.error === 'slug_taken' ? t('slug_taken') : t('save_failed'))
        return
      }
      toast.success(t('saved'))
      setOpen(false)
      router.refresh()
    })

  const toggle = (a: Article) =>
    start(async () => {
      const res = await setArticleStatus(a.id, a.status === 'published' ? 'draft' : 'published', locale)
      if (res.error) toast.error(t('save_failed'))
      else router.refresh()
    })

  const remove = (a: Article) => {
    if (!window.confirm(t('confirm_delete', { title: a.title }))) return
    start(async () => {
      const res = await deleteArticle(a.id, locale)
      if (res.error) toast.error(t('save_failed'))
      else router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" />
          {t('new')}
        </Button>
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('col_title')}</TableHead>
              <TableHead>{t('col_status')}</TableHead>
              <TableHead>{t('col_author')}</TableHead>
              <TableHead>{t('col_date')}</TableHead>
              <TableHead className="text-end">{t('col_actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {t('empty')}
                </TableCell>
              </TableRow>
            )}
            {articles.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">/{a.slug}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={a.status === 'published' ? 'default' : 'secondary'}>
                    {a.status === 'published' ? t('published') : t('draft')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.author_name ?? '—'}</TableCell>
                <TableCell className="num-en text-sm text-muted-foreground">
                  {formatDate(a.published_at ?? a.updated_at, locale)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {a.status === 'published' && (
                      <Link
                        href={`/${locale}/articles/${a.slug}`}
                        target="_blank"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                        title={t('view')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)} title={t('edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(a)} disabled={pending} title={a.status === 'published' ? t('unpublish') : t('publish')}>
                      {a.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(a)} disabled={pending} title={t('delete')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? t('edit_article') : t('new_article')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('title_en')}</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  set({ title: e.target.value })
                  if (!slugTouched) set({ slug: autoSlug(e.target.value) })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('title_ar')}</Label>
              <Input dir="rtl" value={form.title_ar ?? ''} onChange={(e) => set({ title_ar: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('slug')}</Label>
              <Input
                value={form.slug}
                dir="ltr"
                onChange={(e) => {
                  setSlugTouched(true)
                  set({ slug: e.target.value })
                }}
              />
              <p className="text-xs text-muted-foreground" dir="ltr">/{locale}/articles/{form.slug || '…'}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('summary_en')}</Label>
              <textarea className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.summary ?? ''} onChange={(e) => set({ summary: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('summary_ar')}</Label>
              <textarea dir="rtl" className="min-h-[70px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.summary_ar ?? ''} onChange={(e) => set({ summary_ar: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('cover')}</Label>
              <Input dir="ltr" placeholder="https://…" value={form.cover_image_url ?? ''} onChange={(e) => set({ cover_image_url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('body_en')}</Label>
              <textarea dir="ltr" className="min-h-[220px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm" value={form.body} onChange={(e) => set({ body: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('body_ar')}</Label>
              <textarea dir="rtl" className="min-h-[220px] w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.body_ar ?? ''} onChange={(e) => set({ body_ar: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">{t('markdown_hint')}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={save} disabled={pending}>
              {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
