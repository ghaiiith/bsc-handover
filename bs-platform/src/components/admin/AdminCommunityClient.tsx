'use client'

import { useCallback, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  addFeaturedCommunityUser,
  removeFeaturedCommunityUser,
  updateCommunityVisibility,
} from '@/lib/admin/community-actions'
import type { CommunityMember } from '@/types/community'
import { toast } from 'sonner'

interface AdminCommunityClientProps {
  locale: string
  communityVisible: boolean
  featured: CommunityMember[]
  members: CommunityMember[]
  stats: {
    totalMembers: number
    availableCount: number
    aiSearchCount30d: number
  }
}

interface SearchUser {
  id: string
  full_name: string
  full_name_ar?: string | null
  avatar_url?: string | null
  headline?: string | null
}

export default function AdminCommunityClient({
  locale,
  communityVisible,
  featured: initialFeatured,
  members,
  stats,
}: AdminCommunityClientProps) {
  const t = useTranslations('admin')
  const [visible, setVisible] = useState(communityVisible)
  const [featured, setFeatured] = useState(initialFeatured)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [pending, startTransition] = useTransition()

  const runSearch = useCallback(async (q: string) => {
    setSearchQ(q)
    if (q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/community/search-users?q=${encodeURIComponent(q)}`)
      const data = (await res.json()) as { users?: SearchUser[] }
      setSearchResults(data.users ?? [])
    } finally {
      setSearching(false)
    }
  }, [])

  const toggleVisibility = (checked: boolean) => {
    setVisible(checked)
    startTransition(async () => {
      const result = await updateCommunityVisibility(checked, locale)
      if (result.error) {
        setVisible(!checked)
        toast.error(t('save_error'))
      } else {
        toast.success(t('saved'))
      }
    })
  }

  const addFeatured = (userId: string) => {
    startTransition(async () => {
      const result = await addFeaturedCommunityUser(userId, locale)
      if (result.error) {
        toast.error(t('community_add_error'))
        return
      }
      const found = searchResults.find((u) => u.id === userId)
      if (found) {
        setFeatured((prev) => [
          ...prev,
          {
            id: found.id,
            full_name: found.full_name,
            full_name_ar: found.full_name_ar,
            avatar_url: found.avatar_url,
            headline: found.headline,
            skills: [],
            availability: false,
            portfolio_slug: '',
            is_verified: false,
            profile_score: 0,
            completed_courses_count: 0,
            has_cv: false,
            is_featured: true,
            created_at: new Date().toISOString(),
          },
        ])
      }
      setSearchQ('')
      setSearchResults([])
      toast.success(t('community_featured_added'))
    })
  }

  const removeFeatured = (userId: string) => {
    startTransition(async () => {
      const result = await removeFeaturedCommunityUser(userId, locale)
      if (result.error) {
        toast.error(t('save_error'))
        return
      }
      setFeatured((prev) => prev.filter((u) => u.id !== userId))
      toast.success(t('saved'))
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('community')}</h1>
        <p className="text-muted-foreground text-sm">{t('community_subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('community_members')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">{stats.totalMembers}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('community_available')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">{stats.availableCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('community_ai_searches')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">
            {stats.aiSearchCount30d}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('community_featured')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQ}
              onChange={(e) => void runSearch(e.target.value)}
              placeholder={t('community_search_user')}
              className="h-10 w-full rounded-md border bg-background ps-9 pe-3 text-sm"
            />
            {searching && (
              <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
            )}
          </div>

          {searchResults.length > 0 && (
            <ul className="rounded-md border divide-y max-w-md">
              {searchResults.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <span>
                    {user.full_name}
                    {user.headline ? ` — ${user.headline}` : ''}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending || featured.some((f) => f.id === user.id)}
                    onClick={() => addFeatured(user.id)}
                  >
                    {t('add_featured')}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <ul className="space-y-2">
            {featured.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <span>
                  {user.full_name}
                  {user.headline ? ` — ${user.headline}` : ''}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => removeFeatured(user.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {featured.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('community_no_featured')}</p>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('community_visibility')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{t('community_visibility_hint')}</p>
          <Switch checked={visible} onCheckedChange={toggleVisibility} disabled={pending} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('community_members')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pe-4">{t('community_col_name')}</th>
                <th className="pb-2 pe-4">{t('community_col_skills')}</th>
                <th className="pb-2 pe-4">{t('community_col_completion')}</th>
                <th className="pb-2 pe-4">{t('community_col_city')}</th>
                <th className="pb-2 pe-4">{t('community_col_available')}</th>
                <th className="pb-2">{t('community_col_joined')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2 pe-4 font-medium">{m.full_name}</td>
                  <td className="py-2 pe-4 tabular-nums">{m.skills.length}</td>
                  <td className="py-2 pe-4 tabular-nums">{m.profile_score}%</td>
                  <td className="py-2 pe-4">{m.location ?? '—'}</td>
                  <td className="py-2 pe-4">{m.availability ? '✓' : '—'}</td>
                  <td className="py-2 text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
