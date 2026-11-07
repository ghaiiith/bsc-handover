'use client'

import { useTheme } from '@/components/shared/ThemeProvider'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" className={cn('size-8', className)} disabled>
        <Sun className="h-4 w-4 opacity-0" />
      </Button>
    )
  }

  const isDark = (theme === 'system' ? resolvedTheme : theme) === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn('size-8', className)}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
