'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updateDisplayName } from '@/lib/account/account-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AccountSettingsFormProps {
  currentEmail: string
  currentName: string
}

export default function AccountSettingsForm({
  currentEmail,
  currentName,
}: AccountSettingsFormProps) {
  const t = useTranslations('account_settings')
  const [name, setName] = useState(currentName)
  const [email, setEmail] = useState(currentEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const onSaveName = async () => {
    setSavingName(true)
    const res = await updateDisplayName(name)
    setSavingName(false)
    if (res.error) toast.error(t('name_error'))
    else toast.success(t('name_saved'))
  }

  const onSaveEmail = async () => {
    if (email.trim() === currentEmail) return
    setSavingEmail(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: email.trim() })
    setSavingEmail(false)
    if (error) toast.error(t('email_error'))
    else toast.success(t('email_confirm_sent'))
  }

  const onSavePassword = async () => {
    if (password.length < 8) {
      toast.error(t('password_too_short'))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('password_mismatch'))
      return
    }
    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPassword(false)
    if (error) {
      toast.error(t('password_error'))
    } else {
      toast.success(t('password_saved'))
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Display name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('display_name')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>{t('display_name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={onSaveName} disabled={savingName || name.trim() === currentName}>
            {savingName && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('email')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>{t('email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="num-en"
            />
            <p className="text-xs text-muted-foreground">{t('email_change_hint')}</p>
          </div>
          <Button
            onClick={onSaveEmail}
            disabled={savingEmail || email.trim() === currentEmail}
          >
            {savingEmail && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('update_email')}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('change_password')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>{t('new_password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('confirm_password')}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button onClick={onSavePassword} disabled={savingPassword || !password}>
            {savingPassword && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('update_password')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
