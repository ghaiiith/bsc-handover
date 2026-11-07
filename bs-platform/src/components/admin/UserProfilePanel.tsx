'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { fetchAdminUserDetail } from '@/lib/admin/admin-user-actions'
import type { User } from '@/types'

interface UserProfilePanelProps {
  user: User | null
  locale: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UserProfilePanel({
  user,
  locale,
  open,
  onOpenChange,
}: UserProfilePanelProps) {
  const t = useTranslations('admin')
  const isAr = locale === 'ar'
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchAdminUserDetail>>>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !user) {
      setDetail(null)
      return
    }
    setLoading(true)
    fetchAdminUserDetail(user.id).then((d) => {
      setDetail(d)
      setLoading(false)
    })
  }, [open, user])

  if (!open || !user) return null

  const name = isAr ? user.full_name_ar ?? user.full_name : user.full_name

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-md bg-background border-s shadow-xl h-full overflow-y-auto animate-in slide-in-from-right">
        <div className="sticky top-0 flex items-center justify-between border-b p-4 bg-background">
          <h2 className="font-semibold">{t('view_profile')}</h2>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-lg">{name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary">{user.role}</Badge>
                <Badge variant={user.is_active ? 'default' : 'destructive'}>
                  {user.is_active ? t('status_active') : t('status_banned')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">{t('joined_column')}: </span>
              {formatDate(user.created_at, locale)}
            </p>
            {user.phone && (
              <p>
                <span className="text-muted-foreground">{t('phone')}: </span>
                {user.phone}
              </p>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          ) : detail ? (
            <>
              {detail.courses.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">{t('user_courses')}</h3>
                  <ul className="space-y-2 text-sm">
                    {detail.courses.map((c) => (
                      <li key={c.id} className="flex justify-between gap-2">
                        <span className="line-clamp-1">
                          {isAr ? c.title_ar : c.title}
                        </span>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {c.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.enrollments.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">
                    {t('user_enrollments')} ({detail.enrollmentCount})
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {detail.enrollments.map((e) => {
                      const course = Array.isArray(e.course) ? e.course[0] : e.course
                      return (
                        <li key={e.id}>
                          {isAr ? course?.title_ar : course?.title}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
