'use server'

import { revalidatePath } from 'next/cache'
import { revalidateServicesListingCache } from '@/lib/cache/invalidate-listing-cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  adminServiceFormSchema,
  type AdminServiceFormValues,
} from '@/lib/admin/admin-service-form-schemas'
import type { PostgrestError } from '@supabase/supabase-js'

type ServicePayload = {
  title: string
  title_ar: string
  description: string
  description_ar: string
  price: number
  delivery_days: number
  category: string
  portfolio_images: string[]
  contact_email: string | null
  contact_phone: string | null
  contact_link: string | null
  whatsapp_number: string | null
  status: string
  updated_at: string
}

async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user.id
}

function normalizeContact(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeWhatsapp(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  return digits || null
}

function logServiceError(label: string, error: PostgrestError | null) {
  if (!error) return
  console.error(`[admin/services] ${label}:`, error.message, error.code, error.details)
}

function isMissingColumnError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('column') ||
    lower.includes('contact_') ||
    lower.includes('admin_id') ||
    lower.includes('schema cache')
  )
}

function buildServicePayload(data: AdminServiceFormValues, status: string): ServicePayload {
  return {
    title: data.title.trim(),
    title_ar: data.title_ar.trim(),
    description: data.description.trim(),
    description_ar: data.description_ar.trim(),
    price: data.price,
    delivery_days: data.delivery_days,
    category: data.category,
    portfolio_images: data.portfolio_images,
    contact_email: normalizeContact(data.contact_email),
    contact_phone: normalizeContact(data.contact_phone),
    contact_link: normalizeContact(data.contact_link),
    whatsapp_number: normalizeWhatsapp(data.whatsapp_number),
    status,
    updated_at: new Date().toISOString(),
  }
}

function corePayload(payload: ServicePayload) {
  return {
    title: payload.title,
    title_ar: payload.title_ar,
    description: payload.description,
    description_ar: payload.description_ar,
    price: payload.price,
    delivery_days: payload.delivery_days,
    category: payload.category,
    portfolio_images: payload.portfolio_images,
    status: payload.status,
    updated_at: payload.updated_at,
  }
}

type DbClient = Awaited<ReturnType<typeof createClient>>

async function persistService(
  client: DbClient,
  adminId: string,
  payload: ServicePayload,
  serviceId?: string
): Promise<{ id?: string; error?: string; missingColumns?: boolean }> {
  const insertAttempts: Record<string, unknown>[] = [
    { ...payload, seller_id: adminId, admin_id: adminId },
    { ...payload, seller_id: adminId },
    { ...corePayload(payload), seller_id: adminId },
  ]

  const updateAttempts: Record<string, unknown>[] = [
    { ...payload },
    { ...corePayload(payload) },
  ]

  const attempts = serviceId ? updateAttempts : insertAttempts

  for (let i = 0; i < attempts.length; i++) {
    const row = attempts[i]

    if (serviceId) {
      const { error } = await client
        .from('services')
        .update(row)
        .eq('id', serviceId)

      if (!error) {
        return { id: serviceId, missingColumns: i > 0 }
      }

      logServiceError(`update attempt ${i + 1}`, error)
      if (!isMissingColumnError(error.message) || i === attempts.length - 1) {
        return {
          error: error.message,
          missingColumns: isMissingColumnError(error.message),
        }
      }
      continue
    }

    const { data: created, error } = await client
      .from('services')
      .insert(row)
      .select('id')
      .single()

    if (!error && created) {
      return { id: created.id as string, missingColumns: i > 0 }
    }

    if (error) {
      logServiceError(`insert attempt ${i + 1}`, error)
      if (!isMissingColumnError(error.message) || i === attempts.length - 1) {
        return {
          error: error.message,
          missingColumns: isMissingColumnError(error.message),
        }
      }
    }
  }

  return { error: 'create_failed' }
}

async function writeService(
  adminId: string,
  payload: ServicePayload,
  serviceId?: string
): Promise<{ id?: string; error?: string; missingColumns?: boolean }> {
  try {
    const admin = createAdminClient()
    const result = await persistService(admin, adminId, payload, serviceId)
    if (!result.error) return result
  } catch (err) {
    console.warn('[admin/services] Admin client unavailable, using session client:', err)
  }

  const supabase = await createClient()
  return persistService(supabase, adminId, payload, serviceId)
}

export async function saveAdminService(
  values: AdminServiceFormValues,
  locale: string,
  serviceId?: string
): Promise<{
  success?: boolean
  error?: string
  serviceId?: string
  missingColumns?: boolean
}> {
  const adminId = await verifyAdmin()
  if (!adminId) {
    return { error: 'unauthorized' }
  }

  const parsed = adminServiceFormSchema.safeParse(values)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? 'invalid' }
  }

  const status = parsed.data.publish ? 'active' : 'paused'
  const payload = buildServicePayload(parsed.data, status)
  const result = await writeService(adminId, payload, serviceId)

  if (result.error) {
    if (result.missingColumns) {
      return { error: 'missing_db_columns' }
    }
    return { error: result.error }
  }

  if (!result.id) {
    return { error: 'create_failed' }
  }

  revalidateServicesListingCache()
  revalidatePath(`/${locale}/admin/services`)
  revalidatePath(`/${locale}/services`)
  revalidatePath(`/${locale}/services/${result.id}`)

  return {
    success: true,
    serviceId: result.id,
    missingColumns: result.missingColumns,
  }
}

/** Approve a pending service — it becomes publicly visible (report BS-20). */
export async function approveService(serviceId: string, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: service, error } = await admin
    .from('services')
    .update({ status: 'active', rejection_reason: null, updated_at: new Date().toISOString() })
    .eq('id', serviceId)
    .select('seller_id, title, title_ar')
    .single()

  if (error) return { error: error.message }

  if (service?.seller_id) {
    const { createNotifications } = await import('@/lib/notifications')
    const { buildNotificationType, NotificationKind } = await import('@/lib/notifications/types')
    await createNotifications([
      {
        userId: service.seller_id as string,
        title: 'Your service was approved',
        titleAr: 'تمت الموافقة على خدمتك',
        body: `"${service.title ?? ''}" is now live in the marketplace.`,
        bodyAr: `"${service.title_ar ?? service.title ?? ''}" أصبحت الآن منشورة في السوق.`,
        type: buildNotificationType(NotificationKind.serviceApproved),
      },
    ])
  }

  revalidateServicesListingCache()
  revalidatePath(`/${locale}/admin/services`)
  revalidatePath(`/${locale}/services`)
  revalidatePath(`/${locale}/services/${serviceId}`)
  return { success: true }
}

/** Reject a pending service with a reason (report BS-20). */
export async function rejectService(serviceId: string, reason: string, locale: string) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  const trimmed = reason.trim()
  if (trimmed.length < 3) return { error: 'reason_required' }

  const admin = createAdminClient()
  const { data: service, error } = await admin
    .from('services')
    .update({ status: 'rejected', rejection_reason: trimmed, updated_at: new Date().toISOString() })
    .eq('id', serviceId)
    .select('seller_id, title, title_ar')
    .single()

  if (error) return { error: error.message }

  if (service?.seller_id) {
    const { createNotifications } = await import('@/lib/notifications')
    const { buildNotificationType, NotificationKind } = await import('@/lib/notifications/types')
    await createNotifications([
      {
        userId: service.seller_id as string,
        title: 'Your service needs changes',
        titleAr: 'خدمتك تحتاج تعديلات',
        body: `"${service.title ?? ''}" was not approved: ${trimmed}`,
        bodyAr: `لم تتم الموافقة على "${service.title_ar ?? service.title ?? ''}": ${trimmed}`,
        type: buildNotificationType(NotificationKind.serviceRejected),
      },
    ])
  }

  revalidateServicesListingCache()
  revalidatePath(`/${locale}/admin/services`)
  revalidatePath(`/${locale}/services/${serviceId}`)
  return { success: true }
}

export async function adminUpdateServiceStatus(
  serviceId: string,
  status: 'active' | 'paused' | 'deleted',
  locale: string
) {
  if (!(await verifyAdmin())) return { error: 'unauthorized' }

  let client
  try {
    client = createAdminClient()
  } catch {
    client = await createClient()
  }

  const { error } = await client
    .from('services')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', serviceId)

  if (error) return { error: error.message }

  revalidateServicesListingCache()
  revalidatePath(`/${locale}/admin/services`)
  revalidatePath(`/${locale}/services`)
  revalidatePath(`/${locale}/services/${serviceId}`)
  return { success: true }
}
