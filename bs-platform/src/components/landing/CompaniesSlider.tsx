'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

export interface SliderCompany {
  name: string
  logo: string
  link: string
}

/**
 * Report BS-74: a companies slider that ADVANCES BY ITSELF, PAUSES ON HOVER and
 * is SWIPEABLE on touch. With only a few entries there is nothing to scroll, so
 * it degrades to a plain centred row (no auto-advance).
 */
export default function CompaniesSlider({ companies }: { companies: SliderCompany[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)

  // Only slide when the content actually overflows its container.
  const [canSlide, setCanSlide] = useState(false)
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const check = () => setCanSlide(el.scrollWidth > el.clientWidth + 8)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [companies.length])

  const step = useCallback((dir: 1 | -1 = 1) => {
    const el = trackRef.current
    if (!el) return
    const amount = Math.max(160, Math.round(el.clientWidth * 0.6))
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' })
    else el.scrollBy({ left: amount * dir, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!canSlide || paused) return
    const timer = setInterval(() => step(1), 3000)
    return () => clearInterval(timer)
  }, [canSlide, paused, step])

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true)
        touchX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchX.current
        const end = e.changedTouches[0]?.clientX ?? null
        if (start != null && end != null && Math.abs(end - start) > 40) {
          step(end < start ? 1 : -1)
        }
        touchX.current = null
        setPaused(false)
      }}
    >
      <div
        ref={trackRef}
        className={`flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          canSlide ? '' : 'justify-center'
        }`}
      >
        {companies.map((c, i) => {
          const card = (
            <div className="flex h-24 w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card/70 px-4 text-center backdrop-blur transition-colors hover:border-primary/40">
              {c.logo ? (
                <Image
                  src={c.logo}
                  alt={c.name}
                  width={80}
                  height={40}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <Building2 className="h-7 w-7 text-muted-foreground" />
              )}
              <span className="line-clamp-1 text-xs font-medium">{c.name}</span>
            </div>
          )
          return c.link ? (
            <Link key={i} href={c.link} className="shrink-0">
              {card}
            </Link>
          ) : (
            <div key={i} className="shrink-0">
              {card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
