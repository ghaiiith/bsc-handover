'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { startConversation } from '@/lib/messaging/actions'
import { cn } from '@/lib/utils'

interface MessageButtonProps {
  recipientId: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  label?: string
}

export default function MessageButton({
  recipientId,
  className,
  variant = 'outline',
  size = 'sm',
  label,
}: MessageButtonProps) {
  const t = useTranslations('messaging')
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onClick = () => {
    startTransition(async () => {
      const res = await startConversation(recipientId)
      if (res.conversationId) {
        router.push(`/${locale}/dashboard/messages/${res.conversationId}`)
        return
      }
      if (res.error === 'unauthorized') {
        router.push(`/${locale}/login`)
        return
      }
      // Report BS-82: a company without an active subscription is sent to upgrade.
      if (res.error === 'subscription_required') {
        toast.error(t('subscription_required'))
        router.push(`/${locale}/dashboard/subscription`)
        return
      }
      if (res.error === 'recipient_opted_out') {
        toast.error(t('recipient_opted_out'))
        return
      }
      toast.error(res.error === 'not_allowed' ? t('not_allowed') : t('start_error'))
    })
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={isPending}
      className={cn('gap-1.5', className)}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <MessageSquare className="size-3.5" />
      )}
      {label ?? t('message')}
    </Button>
  )
}
