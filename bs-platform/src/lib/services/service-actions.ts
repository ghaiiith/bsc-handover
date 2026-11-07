'use server'

import { revalidatePath } from 'next/cache'
import { revalidateServicesListingCache } from '@/lib/cache/invalidate-listing-cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canOfferServices } from '@/lib/auth/role-capabilities'
import { canBuyerCancel } from '@/lib/services/service-utils'
import { sendOrderStatusNotifications } from '@/lib/services/send-order-notifications'
import { serviceFormSchema, type ServiceFormValues } from '@/lib/services/service-form-schemas'
import type { OrderStatus } from '@/types'

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
}

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function saveService(
  values: ServiceFormValues,
  locale: string,
  serviceId?: string
): Promise<{ success?: boolean; error?: string; serviceId?: string }> {
  const { supabase, user } = await getAuthUser()
  if (!user) return { error: 'unauthorized' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!canOfferServices(profile?.role)) {
    return { error: 'forbidden' }
  }

  const parsed = serviceFormSchema.safeParse(values)
  if (!parsed.success) return { error: 'invalid' }

  const data = parsed.data
  const payload = {
    title: data.title,
    title_ar: data.title_ar,
    description: data.description,
    description_ar: data.description_ar,
    price: data.price,
    delivery_days: data.delivery_days,
    category: data.category,
    portfolio_images: data.portfolio_images,
    portfolio_items: data.portfolio_items ?? [],
    // New or edited services enter admin review before going public (BS-20).
    status: 'pending' as const,
    rejection_reason: null,
    updated_at: new Date().toISOString(),
  }

  if (serviceId) {
    const { error } = await supabase
      .from('services')
      .update(payload)
      .eq('id', serviceId)
      .eq('seller_id', user.id)

    if (error) return { error: error.message }
    revalidateServicesListingCache()
    revalidatePath(`/${locale}/dashboard/my-services`)
    revalidatePath(`/${locale}/services`)
    return { success: true, serviceId }
  }

  const { data: created, error } = await supabase
    .from('services')
    .insert({ ...payload, seller_id: user.id })
    .select('id')
    .single()

  if (error || !created) return { error: error?.message ?? 'create_failed' }

  revalidateServicesListingCache()
  revalidatePath(`/${locale}/dashboard/my-services`)
  revalidatePath(`/${locale}/services`)
  return { success: true, serviceId: created.id as string }
}

export async function updateServiceStatus(
  serviceId: string,
  status: 'active' | 'paused' | 'deleted',
  locale: string
) {
  const { supabase, user } = await getAuthUser()
  if (!user) return { error: 'unauthorized' }

  const { error } = await supabase
    .from('services')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', serviceId)
    .eq('seller_id', user.id)

  if (error) return { error: error.message }
  revalidateServicesListingCache()
  revalidatePath(`/${locale}/dashboard/my-services`)
  revalidatePath(`/${locale}/services`)
  return { success: true }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  locale: string,
  role: 'buyer' | 'seller'
): Promise<{ success?: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser()
  if (!user) return { error: 'unauthorized' }

  const { data: order } = await supabase
    .from('service_orders')
    .select('id, status, buyer_id, seller_id, ordered_at')
    .eq('id', orderId)
    .single()

  if (!order) return { error: 'not_found' }

  if (role === 'seller' && order.seller_id !== user.id) {
    return { error: 'forbidden' }
  }
  if (role === 'buyer' && order.buyer_id !== user.id) {
    return { error: 'forbidden' }
  }

  const current = order.status as OrderStatus
  const allowed = VALID_TRANSITIONS[current]

  if (!allowed.includes(newStatus)) {
    return { error: 'invalid_transition' }
  }

  if (newStatus === 'cancelled') {
    if (current !== 'pending' || !canBuyerCancel(order.ordered_at as string)) {
      return { error: 'cancel_not_allowed' }
    }
  }

  const { error } = await supabase
    .from('service_orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (error) return { error: error.message }

  after(() => sendOrderStatusNotifications(orderId, newStatus))

  revalidatePath(`/${locale}/dashboard/orders/incoming`)
  revalidatePath(`/${locale}/dashboard/orders/my-orders`)
  revalidatePath(`/${locale}/dashboard/orders/${orderId}`)
  return { success: true }
}

export async function submitServiceReview(
  serviceId: string,
  rating: number,
  comment: string | undefined,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser()
  if (!user) return { error: 'unauthorized' }

  if (rating < 1 || rating > 5) return { error: 'invalid_rating' }

  // The seller cannot review their own service.
  const { data: service } = await supabase
    .from('services')
    .select('seller_id')
    .eq('id', serviceId)
    .maybeSingle()
  if (!service) return { error: 'not_found' }
  if (service.seller_id === user.id) return { error: 'own_service' }

  // The reviewer must have actually purchased the service (a paid order).
  const { data: paidOrder } = await supabase
    .from('service_orders')
    .select('id')
    .eq('service_id', serviceId)
    .eq('buyer_id', user.id)
    .not('payment_id', 'is', null)
    .limit(1)
    .maybeSingle()
  if (!paidOrder) return { error: 'not_purchased' }

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('reviewer_id', user.id)
    .eq('target_type', 'service')
    .eq('target_id', serviceId)
    .maybeSingle()

  if (existing) return { error: 'already_reviewed' }

  // reviews are service-role-only (RLS blocks direct inserts).
  const { error } = await createAdminClient().from('reviews').insert({
    reviewer_id: user.id,
    target_type: 'service',
    target_id: serviceId,
    rating,
    comment: comment ?? null,
  })

  if (error) return { error: error.message }

  revalidateServicesListingCache()
  revalidatePath(`/${locale}/services/${serviceId}`)
  revalidatePath(`/${locale}/dashboard/orders/my-orders`)
  return { success: true }
}
