'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { LucideIcon } from 'lucide-react'
import { MoreHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface MobileMoreMenuItem {
  key: string
  href: string
  label: string
  icon: LucideIcon
  active?: boolean
  badge?: number
}

interface MobileMoreMenuProps {
  items: MobileMoreMenuItem[]
  title: string
  active?: boolean
}

export default function MobileMoreMenu({ items, title, active }: MobileMoreMenuProps) {
  const t = useTranslations('common')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2 px-1 text-[10px] min-w-0 transition-colors',
          active ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <MoreHorizontal className="h-5 w-5" />
        <span className="truncate w-full text-center">{t('more')}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-x-0 bottom-0 top-auto max-h-[75vh] translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none border-b-0 p-0 gap-0 sm:max-w-none"
        >
          <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label={t('close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <nav className="overflow-y-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {items.map((item) => {
              const Icon = item.icon
              const isActive = item.active ?? pathname.startsWith(item.href)
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  )
}
