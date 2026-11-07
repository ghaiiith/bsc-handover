'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUserAuthClaims } from '@/lib/auth/sync-user-claims'
import { getAdminUserDetail } from '@/lib/admin/get-admin-users'

async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user.id
}

export async function fetchAdminUserDetail(userId: string) {
  if (!(await verifyAdmin())) return null
  return getAdminUserDetail(userId)
}

export async function changeUserRole(
  userId: string,
  role: 'student' | 'instructor' | 'company' | 'freelancer',
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const adminId = await verifyAdmin()
  if (!adminId) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!target) return { error: 'not_found' }
  if (target.role === 'admin') return { error: 'cannot_change_admin' }

  const { error } = await admin
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) return { error: error.message }

  await syncUserAuthClaims(userId)

  revalidatePath(`/${locale}/admin/users`)
  return { success: true }
}

export async function setUserVerified(
  userId: string,
  isVerified: boolean,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const adminId = await verifyAdmin()
  if (!adminId) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ is_verified: isVerified })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath(`/${locale}/admin/users`)
  return { success: true }
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const adminId = await verifyAdmin()
  if (!adminId) return { error: 'unauthorized' }

  if (userId === adminId && !isActive) {
    return { error: 'cannot_ban_self' }
  }

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!target) return { error: 'not_found' }
  if (target.role === 'admin' && !isActive) return { error: 'cannot_ban_admin' }

  const { error } = await admin
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) return { error: error.message }

  await syncUserAuthClaims(userId)

  revalidatePath(`/${locale}/admin/users`)
  return { success: true }
}
