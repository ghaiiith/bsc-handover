'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ServicePortfolioItem } from '@/types'

interface ServicePortfolioProps {
  images: string[]
  items?: ServicePortfolioItem[]
  locale: string
}

export default function ServicePortfolio({ images, items = [] }: ServicePortfolioProps) {
  const t = useTranslations('services')
  const [lightbox, setLightbox] = useState<string | null>(null)

  const structured = items.filter(
    (it) => it.title || it.description || (it.links?.length ?? 0) > 0 || (it.images?.length ?? 0) > 0
  )
  const isEmpty = images.length === 0 && structured.length === 0

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{t('portfolio')}</h2>
      {isEmpty && <p className="text-sm text-muted-foreground">{t('no_portfolio')}</p>}

      {/* Structured entries (BS-22) */}
      {structured.length > 0 && (
        <div className="space-y-4">
          {structured.map((it, idx) => (
            <div key={idx} className="rounded-xl border p-4">
              {it.title && <h3 className="font-semibold">{it.title}</h3>}
              {it.description && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {it.description}
                </p>
              )}
              {(it.images?.length ?? 0) > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {it.images!.map((src) => (
                    <button
                      key={src}
                      type="button"
                      className="relative aspect-square overflow-hidden rounded-lg"
                      onClick={() => setLightbox(src)}
                    >
                      <Image src={src} alt="" fill className="object-cover" sizes="200px" />
                    </button>
                  ))}
                </div>
              )}
              {(it.links?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {it.links!.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      <ExternalLink className="size-3" />
                      <span className="max-w-[220px] truncate">{link.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legacy flat images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((src) => (
            <button
              key={src}
              type="button"
              className="relative aspect-square overflow-hidden rounded-lg"
              onClick={() => setLightbox(src)}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="200px" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={lightbox !== null} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">{t('portfolio')}</DialogTitle>
          {lightbox && (
            <div className="relative aspect-video w-full">
              <Image src={lightbox} alt="" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
