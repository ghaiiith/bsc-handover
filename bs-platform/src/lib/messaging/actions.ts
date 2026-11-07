'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canMessage } from '@/lib/messaging/permissions'
import type { UserRole } from '@/types'

async function getAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export interface ConversationSummary {
  id: string
  other: { id: string; full_name: string | null; full_name_ar: string | null; avatar_url: string | null; role: UserRole }
  last_message_at: string
  last_body: string | null
  unread: number
}

/** Find-or-create a conversation with a recipient, enforcing the messaging rule. */
export async function startConversation(
  recipientId: string
): Promise<{ conversationId?: string; error?: string }> {
  const { user } = await getAuth()
  if (!user) return { error: 'unauthorized' }
  if (recipientId === user.id) return { error: 'self' }

  const admin = createAdminClient()
  const { data: pair } = await admin
    .from('users')
    .select('id, role, accepts_messages')
    .in('id', [user.id, recipientId])

  const me = pair?.find((p) => p.id === user.id)
  const them = pair?.find((p) => p.id === recipientId)
  if (!me || !them) return { error: 'not_found' }

  if (!canMessage(me.role as UserRole, them.role as UserRole)) {
    return { error: 'not_allowed' }
  }

  // Report BS-82: the recipient can opt out of unsolicited messages.
  if ((them as { accepts_messages?: boolean | null }).accepts_messages === false) {
    return { error: 'recipient_opted_out' }
  }

  // Report BS-69: direct contact with a candidate is the paid product. A company
  // must hold an active subscription to start a conversation — enforced here on
  // the server, not just by hiding a button. The UI shows an upgrade prompt.
  if (me.role === 'company') {
    const { hasActiveEmployerSubscription } = await import(
      '@/lib/jobs/employer-subscription'
    )
    if (!(await hasActiveEmployerSubscription(me.id))) {
      return { error: 'subscription_required' }
    }
  }

  // Look for an existing conversation for this unordered pair.
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .or(
      `and(participant_one.eq.${user.id},participant_two.eq.${recipientId}),and(participant_one.eq.${recipientId},participant_two.eq.${user.id})`
    )
    .maybeSingle()

  if (existing?.id) return { conversationId: existing.id as string }

  const { data: created, error } = await admin
    .from('conversations')
    .insert({ participant_one: user.id, participant_two: recipientId })
    .select('id')
    .single()

  if (error || !created) return { error: error?.message ?? 'create_failed' }
  return { conversationId: created.id as string }
}

export async function sendMessage(
  conversationId: string,
  body: string,
  locale: string
): Promise<{ success?: boolean; error?: string }> {
  const { user } = await getAuth()
  if (!user) return { error: 'unauthorized' }
  const trimmed = body.trim()
  if (!trimmed) return { error: 'empty' }
  if (trimmed.length > 4000) return { error: 'too_long' }

  const admin = createAdminClient()
  const { data: convo } = await admin
    .from('conversations')
    .select('id, participant_one, participant_two')
    .eq('id', conversationId)
    .maybeSingle()
  if (!convo) return { error: 'not_found' }
  if (convo.participant_one !== user.id && convo.participant_two !== user.id) {
    return { error: 'forbidden' }
  }

  const { error } = await admin
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: trimmed })
  if (error) return { error: error.message }

  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  revalidatePath(`/${locale}/dashboard/messages`)
  return { success: true }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { user } = await getAuth()
  if (!user) return
  const admin = createAdminClient()
  await admin
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null)
}
