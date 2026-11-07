'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
}

export default function AuthSubmitButton({
  children,
  loading,
  loadingText,
  className,
  disabled,
  ...props
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#F97316] text-[15px] font-bold text-white transition-all hover:bg-[#EA6C0A] hover:shadow-[0_4px_12px_rgba(249,115,22,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
