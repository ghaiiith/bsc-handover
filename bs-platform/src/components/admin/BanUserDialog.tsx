'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { setUserActive } from '@/lib/admin/admin-user-actions'
import type { User } from '@/types'

interface BanUserDialogProps {
  user: User | null
  locale: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function BanUserDialog({
  user,
  locale,
  open,
  onOpenChange,
}: BanUserDialogProps) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isAr = locale === 'ar'

  if (!user) return null

  const name = isAr ? user.full_name_ar ?? user.full_name : user.full_name
  const isBan = user.is_active

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await setUserActive(user.id, !isBan, locale)
      if (result.error === 'cannot_ban_self') {
        toast.error(t('cannot_ban_self'))
        return
      }
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(isBan ? t('user_banned') : t('user_unbanned'))
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isBan ? t('ban_user') : t('unban_user')}</DialogTitle>
          <DialogDescription>
            {isBan ? t('ban_confirm', { name }) : t('unban_confirm', { name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            variant={isBan ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
