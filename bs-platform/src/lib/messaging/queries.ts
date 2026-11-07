import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types'

export interface ConversationRow {
  id: string
  other: {
    id: string
    full_name: string | null
    full_name_ar: string | null
    avatar_url: string | null
    role: UserRole
  }
  last_message_at: string
  last_body: string | null
  unread: number
}

export interface MessageRow {
  id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

export async function getConversations(userId: string): Promise<ConversationRow[]> {
  const admin = createAdminClient()
  const { data: convos } = await admin
    .from('conversations')
    .select('id, participant_one, participant_two, last_message_at')
    .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
    .order('last_message_at', { ascending: false })

  if (!convos || convos.length === 0) return []

  const otherIds = convos.map((c) =>
    c.participant_one === userId ? c.participant_two : c.participant_one
  )
  const convoIds = convos.map((c) => c.id)

  const [{ data: users }, { data: lastMsgs }, { data: unreadMsgs }] = await Promise.all([
    admin.from('users').select('id, full_name, full_name_ar, avatar_url, role').in('id', otherIds),
    admin
      .from('messages')
      .select('conversation_id, body, created_at')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false }),
    admin
      .from('messages')
      .select('conversation_id, sender_id, read_at')
      .in('conversation_id', convoIds)
      .is('read_at', null),
  ])

  const userMap = new Map((users ?? []).map((u) => [u.id, u]))
  const lastByConvo = new Map<string, string>()
  ;(lastMsgs ?? []).forEach((m) => {
    if (!lastByConvo.has(m.conversation_id as string)) {
      lastByConvo.set(m.conversation_id as string, m.body as string)
    }
  })
  const unreadByConvo = new Map<string, number>()
  ;(unreadMsgs ?? []).forEach((m) => {
    if (m.sender_id !== userId) {
      unreadByConvo.set(
        m.conversation_id as string,
        (unreadByConvo.get(m.conversation_id as string) ?? 0) + 1
      )
    }
  })

  return convos.map((c) => {
    const otherId = c.participant_one === userId ? c.participant_two : c.participant_one
    const u = userMap.get(otherId as string)
    return {
      id: c.id as string,
      other: {
        id: otherId as string,
        full_name: u?.full_name ?? null,
        full_name_ar: u?.full_name_ar ?? null,
        avatar_url: u?.avatar_url ?? null,
        role: (u?.role as UserRole) ?? 'student',
      },
      last_message_at: c.last_message_at as string,
      last_body: lastByConvo.get(c.id as string) ?? null,
      unread: unreadByConvo.get(c.id as string) ?? 0,
    }
  })
}

export async function getConversationWithMessages(
  conversationId: string,
  userId: string
): Promise<{
  other: ConversationRow['other']
  messages: MessageRow[]
} | null> {
  const admin = createAdminClient()
  const { data: convo } = await admin
    .from('conversations')
    .select('id, participant_one, participant_two')
    .eq('id', conversationId)
    .maybeSingle()
  if (!convo) return null
  if (convo.participant_one !== userId && convo.participant_two !== userId) return null

  const otherId = convo.participant_one === userId ? convo.participant_two : convo.participant_one
  const [{ data: u }, { data: msgs }] = await Promise.all([
    admin
      .from('users')
      .select('id, full_name, full_name_ar, avatar_url, role')
      .eq('id', otherId)
      .maybeSingle(),
    admin
      .from('messages')
      .select('id, sender_id, body, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
  ])

  return {
    other: {
      id: otherId as string,
      full_name: u?.full_name ?? null,
      full_name_ar: u?.full_name_ar ?? null,
      avatar_url: u?.avatar_url ?? null,
      role: (u?.role as UserRole) ?? 'student',
    },
    messages: (msgs ?? []) as MessageRow[],
  }
}
