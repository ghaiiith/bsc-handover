'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { changeUserRole } from '@/lib/admin/admin-user-actions'
import type { User } from '@/types'

interface ChangeRoleDialogProps {
  user: User | null
  locale: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function ChangeRoleDialog({
  user,
  locale,
  open,
  onOpenChange,
  onSuccess,
}: ChangeRoleDialogProps) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const [role, setRole] = useState<'student' | 'instructor' | 'company' | 'freelancer'>('student')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!user) return
    startTransition(async () => {
      const result = await changeUserRole(user.id, role, locale)
      if (!result.success) {
        toast.error(t('action_error'))
        return
      }
      toast.success(t('role_updated'))
      onOpenChange(false)
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('change_role')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t('new_role')}</Label>
          <Select
            value={role}
            onValueChange={(v) =>
              v && setRole(v as 'student' | 'instructor' | 'company' | 'freelancer')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">student</SelectItem>
              <SelectItem value="instructor">instructor</SelectItem>
              <SelectItem value="company">company</SelectItem>
              <SelectItem value="freelancer">freelancer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
