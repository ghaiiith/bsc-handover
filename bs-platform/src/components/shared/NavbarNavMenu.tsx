'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface NavMenuItem {
  href: string
  label: string
  description?: string
}

interface NavbarNavMenuProps {
  label: string
  items: NavMenuItem[]
  isRTL: boolean
  /** Always render the labeled dropdown, even when there's a single item. */
  alwaysDropdown?: boolean
}

export default function NavbarNavMenu({
  label,
  items,
  isRTL,
  alwaysDropdown = false,
}: NavbarNavMenuProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )

  if (items.length === 0) return null

  if (items.length === 1 && !alwaysDropdown) {
    const item = items[0]
    return (
      <Link
        href={item.href}
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          pathname.startsWith(item.href)
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-56">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.href}
            className="flex flex-col items-start gap-0.5"
            onClick={() => router.push(item.href)}
          >
            <span className="font-medium">{item.label}</span>
            {item.description && (
              <span className="text-xs text-muted-foreground">{item.description}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
