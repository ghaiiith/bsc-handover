'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Link2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ShareButtonsProps {
  url: string
  title: string
  className?: string
}

export default function ShareButtons({ url, title, className }: ShareButtonsProps) {
  const t = useTranslations('common')
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(title)

  const targets = [
    { key: 'whatsapp', href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, label: 'WhatsApp' },
    { key: 'telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, label: 'Telegram' },
    { key: 'x', href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`, label: 'X' },
    { key: 'facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, label: 'Facebook' },
    { key: 'linkedin', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, label: 'LinkedIn' },
  ]

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success(t('link_copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('copy_failed'))
    }
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, url })
      } catch {
        /* user cancelled */
      }
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm font-medium text-muted-foreground">{t('share')}:</span>

      {typeof navigator !== 'undefined' && 'share' in navigator ? (
        <button
          type="button"
          onClick={nativeShare}
          aria-label={t('share')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        >
          <Share2 className="h-4 w-4" />
        </button>
      ) : null}

      {targets.map((tg) => (
        <a
          key={tg.key}
          href={tg.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={tg.label}
          className="inline-flex h-9 items-center rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        >
          {tg.label}
        </a>
      ))}

      <button
        type="button"
        onClick={copyLink}
        aria-label={t('copy_link')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  )
}
