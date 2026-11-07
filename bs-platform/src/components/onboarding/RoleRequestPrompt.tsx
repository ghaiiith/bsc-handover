'use client'

import { useEffect, useState, useTransition } from 'react'
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
import {
  declineOnboardingRoleRequest,
  submitOnboardingRoleRequest,
} from '@/lib/onboarding/submit-onboarding-role-request'
import type { OnboardingAccountType } from '@/types/onboarding'

interface RoleRequestPromptProps {
  locale: string
  accountType: OnboardingAccountType
  open: boolean
}

export default function RoleRequestPrompt({
  locale,
  accountType,
  open: initialOpen,
}: RoleRequestPromptProps) {
  const t = useTranslations('role_request_prompt')
  const router = useRouter()
  const [open, setOpen] = useState(initialOpen)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setOpen(initialOpen)
  }, [initialOpen])

  const accountLabelKey = `account_${accountType}` as const

  const handleDecline = () => {
    startTransition(async () => {
      const result = await declineOnboardingRoleRequest(locale)
      if (!result.ok) {
        toast.error(t('error'))
        return
      }
      setOpen(false)
      router.replace(`/${locale}/dashboard`)
      router.refresh()
    })
  }

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await submitOnboardingRoleRequest(locale)
      if (!result.ok) {
        if (result.error === 'pending_exists') {
          toast.info(t('already_submitted'))
        } else {
          toast.error(t('error'))
        }
        setOpen(false)
        router.replace(`/${locale}/dashboard`)
        router.refresh()
        return
      }
      toast.success(t('submit_success'))
      setOpen(false)
      router.replace(`/${locale}/dashboard`)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description', { role: t(accountLabelKey) })}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('body')}</p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full bg-[#E57D17] hover:bg-[#CC6F14]"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? t('submitting') : t('submit_yes')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleDecline}
            disabled={isPending}
          >
            {t('submit_no')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
