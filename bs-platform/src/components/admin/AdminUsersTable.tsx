'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MoreHorizontal } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import UserProfilePanel from '@/components/admin/UserProfilePanel'
import ChangeRoleDialog from '@/components/admin/ChangeRoleDialog'
import BanUserDialog from '@/components/admin/BanUserDialog'
import VerifiedBadge from '@/components/shared/VerifiedBadge'
import { setUserVerified } from '@/lib/admin/admin-user-actions'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { User } from '@/types'

interface AdminUsersTableProps {
  locale: string
  users: User[]
}

const roleStyles: Record<string, string> = {
  student: 'bg-muted text-muted-foreground',
  instructor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

export default function AdminUsersTable({ locale, users }: AdminUsersTableProps) {
  const t = useTranslations('admin')
  const router = useRouter()
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [roleUser, setRoleUser] = useState<User | null>(null)
  const [banUser, setBanUser] = useState<User | null>(null)
  const isAr = locale === 'ar'

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        {t('no_users')}
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('user_column')}</TableHead>
            <TableHead>{t('email_column')}</TableHead>
            <TableHead>{t('role_column')}</TableHead>
            <TableHead>{t('status_column')}</TableHead>
            <TableHead>{t('joined_column')}</TableHead>
            <TableHead className="text-end">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const name = isAr ? user.full_name_ar ?? user.full_name : user.full_name
            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url ?? undefined} />
                      <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate max-w-[140px]">{name}</span>
                    {user.is_verified ? <VerifiedBadge /> : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge className={roleStyles[user.role]}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      user.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }
                  >
                    {user.is_active ? t('status_active') : t('status_banned')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(user.created_at, locale)}
                </TableCell>
                <TableCell className="text-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setProfileUser(user)}>
                        {t('view_profile')}
                      </DropdownMenuItem>
                      {user.role !== 'admin' && (
                        <DropdownMenuItem onClick={() => setRoleUser(user)}>
                          {t('change_role')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={async () => {
                          const res = await setUserVerified(user.id, !user.is_verified, locale)
                          if (res.success) {
                            toast.success(t(user.is_verified ? 'unverified' : 'verified'))
                            router.refresh()
                          } else {
                            toast.error(t('action_failed'))
                          }
                        }}
                      >
                        {user.is_verified ? t('remove_verification') : t('verify_user')}
                      </DropdownMenuItem>
                      {user.is_active ? (
                        <DropdownMenuItem onClick={() => setBanUser(user)}>
                          {t('ban_user')}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setBanUser(user)}>
                          {t('unban_user')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <UserProfilePanel
        user={profileUser}
        locale={locale}
        open={profileUser !== null}
        onOpenChange={(open) => !open && setProfileUser(null)}
      />

      <ChangeRoleDialog
        user={roleUser}
        locale={locale}
        open={roleUser !== null}
        onOpenChange={(open) => {
          if (!open) setRoleUser(null)
        }}
        onSuccess={() => router.refresh()}
      />

      <BanUserDialog
        user={banUser}
        locale={locale}
        open={banUser !== null}
        onOpenChange={(open) => {
          if (!open) setBanUser(null)
          else router.refresh()
        }}
      />
    </>
  )
}
