'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'
import type { HomepageBanner as Banner } from '@/lib/admin/platform-settings'

/**
 * The large homepage banner. The admin adds images from the dashboard and they
 * ROTATE BY THEMSELVES; hovering or touching pauses so a visitor can read one.
 * When no image has been added yet it still renders a branded panel, so the hero
 * layout never collapses (which is what made the banner look "missing").
 */
export default function HomepageBanner({ banners }: { banners: Banner[] }) {
  const locale = useLocale()
  const t = useTranslations('landing.hero')
  const isAr = locale === 'ar'
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)

  const go = useCallback(
    (dir: 1 | -1) => {
      if (banners.length < 2) return
      setIndex((i) => (i + dir + banners.length) % banners.length)
    },
    [banners.length]
  )

  useEffect(() => {
    if (banners.length < 2 || paused) return
    const timer = setInterval(() => go(1), 5000)
    return () => clearInterval(timer)
  }, [banners.length, paused, go])

  const slide = banners.length > 0 ? banners[Math.min(index, banners.length - 1)] : null
  const title = slide ? (isAr ? slide.title_ar || slide.title : slide.title || slide.title_ar) : ''
  const text = slide ? (isAr ? slide.text_ar || slide.text : slide.text || slide.text_ar) : ''

  const frame =
    'relative h-full min-h-[260px] w-full overflow-hidden rounded-3xl border border-border/50 sm:min-h-[340px] lg:min-h-[420px]'

  // No image configured yet — a branded panel keeps the layout intact.
  if (!slide) {
    return (
      <div className={`${frame} bg-gradient-to-br from-brand-teal via-brand-teal/90 to-[#02323a]`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <Sparkles className="h-8 w-8 text-brand-orange" />
          <p className="text-2xl font-bold text-white sm:text-3xl">{t('line1')}</p>
          <p className="max-w-md text-sm text-white/70">{t('subtitle')}</p>
        </div>
      </div>
    )
  }

  const inner = (
    <div className={frame}>
      {banners.map((b, i) => (
        <Image
          key={b.id}
          src={b.image_url}
          alt={i === index ? title || '' : ''}
          fill
          priority={i === 0}
          sizes="(max-width: 1024px) 100vw, 66vw"
          className={`object-cover transition-opacity duration-700 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {(title || text) && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/25 to-transparent p-6 sm:p-8">
          {title && <h2 className="text-xl font-bold text-white sm:text-3xl">{title}</h2>}
          {text && <p className="mt-2 max-w-xl text-sm text-white/90">{text}</p>}
        </div>
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-4 flex w-full justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`${i + 1}`}
              onClick={(e) => {
                e.preventDefault()
                setIndex(i)
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-7 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div
      className="h-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true)
        touchX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchX.current
        const end = e.changedTouches[0]?.clientX ?? null
        if (start != null && end != null && Math.abs(end - start) > 40) {
          go(end < start ? 1 : -1)
        }
        touchX.current = null
        setPaused(false)
      }}
    >
      {slide.link ? (
        <Link href={slide.link} className="block h-full">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  )
}
