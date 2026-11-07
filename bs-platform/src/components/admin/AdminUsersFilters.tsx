'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AdminUsersFiltersProps {
  locale: string
  params: {
    q?: string
    role?: string
    status?: string
    sort?: string
  }
}

export default function AdminUsersFilters({ locale, params }: AdminUsersFiltersProps) {
  const t = useTranslations('admin')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(params.q ?? '')

  const update = (key: string, value: string) => {
    const qs = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') qs.set(key, value)
    else qs.delete(key)
    qs.delete('page')
    router.push(`/${locale}/admin/users?${qs.toString()}`)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label>{t('search_users')}</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search_users')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              update('q', query)
            }
          }}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('role_filter')}</Label>
        <Select
          value={params.role ?? 'all'}
          onValueChange={(v) => v && update('role', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter_all')}</SelectItem>
            <SelectItem value="student">student</SelectItem>
            <SelectItem value="instructor">instructor</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('status_filter')}</Label>
        <Select
          value={params.status ?? 'all'}
          onValueChange={(v) => v && update('status', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter_all')}</SelectItem>
            <SelectItem value="active">{t('status_active')}</SelectItem>
            <SelectItem value="banned">{t('status_banned')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('sort_by')}</Label>
        <Select
          value={params.sort ?? 'newest'}
          onValueChange={(v) => v && update('sort', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('sort_newest')}</SelectItem>
            <SelectItem value="oldest">{t('sort_oldest')}</SelectItem>
            <SelectItem value="name_asc">{t('sort_name')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
