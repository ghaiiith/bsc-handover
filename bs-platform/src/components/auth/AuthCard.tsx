import { cn } from '@/lib/utils'

interface AuthCardProps {
  children: React.ReactNode
  className?: string
}

export default function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        'w-full max-w-[440px] rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)] md:p-10',
        className
      )}
    >
      {children}
    </div>
  )
}
