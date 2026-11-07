'use client'

import { AlertCircle } from 'lucide-react'

interface AuthErrorBoxProps {
  message: string
  action?: React.ReactNode
}

export default function AuthErrorBox({ message, action }: AuthErrorBoxProps) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-lg border-s-[3px] border-s-[#EF4444] bg-[#FEF2F2] px-4 py-3"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#EF4444]">{message}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  )
}
