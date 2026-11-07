'use client'

import PaymentMethodModal from '@/components/payment/PaymentMethodModal'

interface ServicePaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: string
  serviceTitle: string
  price: number
  requirements: string
  locale: string
  onSuccess?: () => void
}

export default function ServicePaymentModal(props: ServicePaymentModalProps) {
  return (
    <PaymentMethodModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      type="service"
      productId={props.serviceId}
      productTitle={props.serviceTitle}
      price={props.price}
      locale={props.locale}
      requirements={props.requirements}
      onSuccess={props.onSuccess}
    />
  )
}
