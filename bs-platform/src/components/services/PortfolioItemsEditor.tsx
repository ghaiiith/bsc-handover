'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { PortfolioItem } from '@/lib/services/service-form-schemas'

interface PortfolioItemsEditorProps {
  value: PortfolioItem[]
  onChange: (items: PortfolioItem[]) => void
}

const MAX_ITEMS = 10

export default function PortfolioItemsEditor({ value, onChange }: PortfolioItemsEditorProps) {
  const t = useTranslations('portfolio_editor')
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const update = (idx: number, patch: Partial<PortfolioItem>) => {
    onChange(value.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const addItem = () => {
    if (value.length >= MAX_ITEMS) return
    onChange([...value, { title: '', description: '', links: [], images: [] }])
  }

  const removeItem = (idx: number) => onChange(value.filter((_, i) => i !== idx))

  const onUpload = async (idx: number, files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploadingIdx(idx)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/services/portfolio-image', { method: 'POST', body: fd })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(t('upload_error'))
        return
      }
      update(idx, { images: [...(value[idx].images ?? []), data.url] })
    } catch {
      toast.error(t('upload_error'))
    } finally {
      setUploadingIdx(null)
    }
  }

  const removeImage = (idx: number, url: string) => {
    update(idx, { images: (value[idx].images ?? []).filter((u) => u !== url) })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('hint')}</p>

      {value.map((item, idx) => (
        <Card key={idx}>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('entry')} {idx + 1}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{t('entry_title')}</Label>
              <Input
                value={item.title ?? ''}
                onChange={(e) => update(idx, { title: e.target.value })}
                placeholder={t('entry_title_ph')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('entry_desc')}</Label>
              <Textarea
                value={item.description ?? ''}
                onChange={(e) => update(idx, { description: e.target.value })}
                rows={2}
                placeholder={t('entry_desc_ph')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('entry_links')}</Label>
              <Textarea
                value={(item.links ?? []).join('\n')}
                onChange={(e) =>
                  update(idx, {
                    links: e.target.value
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean),
                  })
                }
                rows={2}
                placeholder={t('entry_links_ph')}
                className="num-en"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('entry_images')}</Label>
              <div className="flex flex-wrap gap-2">
                {(item.images ?? []).map((url) => (
                  <div key={url} className="relative size-16 overflow-hidden rounded-md border">
                    <Image src={url} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx, url)}
                      className="absolute end-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <input
                  ref={(el) => {
                    fileRefs.current[idx] = el
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void onUpload(idx, e.target.files)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRefs.current[idx]?.click()}
                  disabled={uploadingIdx === idx}
                  className="flex size-16 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted"
                >
                  {uploadingIdx === idx ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {value.length < MAX_ITEMS && (
        <Button type="button" variant="outline" onClick={addItem} className="gap-2">
          <Plus className="size-4" />
          {t('add_entry')}
        </Button>
      )}
    </div>
  )
}
