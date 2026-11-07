import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSessionProfile } from '@/lib/auth/profile'
import { getConversations } from '@/lib/messaging/queries'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'

export default async function MessagesPage() {
  const locale = await getLocale()
  const t = await getTranslations('messaging')
  const isAr = locale === 'ar'
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  const conversations = await getConversations(session.authUser.id)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {conversations.length === 0 ? (
        <div className="rounded-xl border py-16 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-3 size-8 opacity-50" />
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {conversations.map((c) => {
            const name =
              (isAr ? c.other.full_name_ar : c.other.full_name) || c.other.full_name || t('user')
            return (
              <Link
                key={c.id}
                href={`/${locale}/dashboard/messages/${c.id}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                <Avatar className="size-11 shrink-0">
                  <AvatarImage src={c.other.avatar_url ?? ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{name}</span>
                    {c.unread > 0 && (
                      <Badge className="bg-primary text-primary-foreground">{c.unread}</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.last_body ?? t('no_messages_yet')}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const metadata = { title: 'Messages' }
