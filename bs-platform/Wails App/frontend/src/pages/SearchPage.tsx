import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, FileText, Layers, Loader2, Search } from 'lucide-react'
import { cms } from '@/lib/cms'
import type { SearchResult } from '@/types/cms'
import { PageHeader } from '@/components/admin/PageHeader'
import { EmptyState } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CourseStatusBadge } from '@/components/ui/badge'

export function SearchPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      setLoading(true)
      void cms
        .search(q)
        .then(setResults)
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const iconFor = (type: SearchResult['type']) => {
    if (type === 'course') return BookOpen
    if (type === 'section') return Layers
    return FileText
  }

  const open = (r: SearchResult) => {
    if (r.type === 'course') navigate(`/courses/${r.id}`)
    else if (r.type === 'lesson') navigate(`/courses/${r.courseId}/lessons/${r.id}`)
    else navigate(`/courses/${r.courseId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Global search" description="Search courses, sections, and lessons." />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="ps-9"
            />
          </div>
          {loading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}
          {!loading && q && results.length === 0 && (
            <EmptyState icon={Search} title="No results" description="Try a different search term." />
          )}
          <ul className="divide-y">
            {results.map((r) => {
              const Icon = iconFor(r.type)
              return (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => open(r)}
                    className="flex w-full items-center gap-3 px-2 py-3 text-start hover:bg-muted/50"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.titleAr}</p>
                    </div>
                    <span className="text-xs capitalize text-muted-foreground">{r.type}</span>
                    {r.status && <CourseStatusBadge status={r.status} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
