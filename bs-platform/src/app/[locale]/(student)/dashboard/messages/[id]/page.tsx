import { notFound, redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/profile'
import { getConversationWithMessages } from '@/lib/messaging/queries'
import { markConversationRead } from '@/lib/messaging/actions'
import ConversationView from '@/components/messaging/ConversationView'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const locale = await getLocale()
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const data = await getConversationWithMessages(id, session.authUser.id)
  if (!data) notFound()

  // Mark the other party's messages as read on open.
  await markConversationRead(id)

  return (
    <ConversationView
      locale={locale}
      conversationId={id}
      currentUserId={session.authUser.id}
      other={data.other}
      initialMessages={data.messages}
    />
  )
}
