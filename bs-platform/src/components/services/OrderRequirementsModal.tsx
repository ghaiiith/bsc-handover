'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatPrice } from '@/lib/utils'
import ServicePaymentModal from '@/components/services/ServicePaymentModal'
import type { Service } from '@/types'

interface OrderRequirementsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service
  locale: string
  onSuccess?: () => void
}

export default function OrderRequirementsModal({
  open,
  onOpenChange,
  service,
  locale,
  onSuccess,
}: OrderRequirementsModalProps) {
  const t = useTranslations('services')
  const tCommon = useTranslations('common')
  const isAr = locale === 'ar'
  const title = isAr ? service.title_ar : service.title

  const [requirements, setRequirements] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = (next: boolean) => {
    if (!next) {
      setRequirements('')
      setError(null)
    }
    onOpenChange(next)
  }

  const handleProceed = () => {
    if (requirements.trim().length < 20) {
      setError(t('requirements_min_error'))
      return
    }
    setError(null)
    onOpenChange(false)
    setPaymentOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('order_details_title')}</DialogTitle>
            <DialogDescription>
              {title} · {formatPrice(service.price)} · {service.delivery_days}{' '}
              {t('days')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="requirements">{t('requirements_label')}</Label>
            <Textarea
              id="requirements"
              rows={6}
              maxLength={2000}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={t('requirements_placeholder')}
            />
            <p className="text-xs text-muted-foreground text-end">
              {requirements.length}/2000
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleProceed}>{t('proceed_payment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ServicePaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        serviceId={service.id}
        serviceTitle={title}
        price={service.price}
        requirements={requirements}
        locale={locale}
        onSuccess={onSuccess}
      />
    </>
  )
}
