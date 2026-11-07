import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { cms } from '@/lib/cms'
import { formatDate, formatPrice } from '@/lib/utils'
import type { CourseListItem } from '@/types/cms'
import { PageHeader } from '@/components/admin/PageHeader'
import { EmptyState } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CourseStatusBadge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { PageSkeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BookOpen } from 'lucide-react'

const STATUS_FILTERS = ['all', 'published', 'pending', 'draft', 'rejected', 'archived'] as const

export function CoursesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<CourseListItem[]>([])
  const [stats, setStats] = useState({ published: 0, pending: 0, draft: 0, rejected: 0, archived: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [sort, setSort] = useState('updated_at')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    instructorId: '',
    title: '',
    title_ar: '',
    category: 'general',
    level: 'beginner',
    language: 'ar',
  })
  const [instructors, setInstructors] = useState<{ id: string; full_name: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await cms.listCourses({
        q,
        status,
        sort,
        order: 'desc',
        page: String(page),
        pageSize: '20',
      })
      setItems(data.items)
      setStats(data.stats)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }, [q, status, sort, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (showCreate) {
      void cms.listInstructors().then((r) => setInstructors(r.instructors))
    }
  }, [showCreate])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((c) => c.id)))
  }

  const runAction = async (id: string, action: () => Promise<void>) => {
    setBusy(id)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const bulk = async (action: string) => {
    if (!selected.size) return
    setBusy('bulk')
    try {
      await cms.bulkCourses([...selected], action)
      setSelected(new Set())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed')
    } finally {
      setBusy(null)
    }
  }

  const createCourse = async () => {
    setBusy('create')
    try {
      const { courseId } = await cms.createCourse(createForm)
      setShowCreate(false)
      navigate(`/courses/${courseId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(null)
    }
  }

  if (loading && !items.length) return <PageSkeleton />

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Courses"
        description="Create, edit, publish, and manage all platform courses."
        actions={
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create course
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-5">
        {(
          [
            ['Published', stats.published, 'published'],
            ['Pending', stats.pending, 'pending'],
            ['Draft', stats.draft, 'draft'],
            ['Rejected', stats.rejected, 'rejected'],
            ['Archived', stats.archived, 'archived'],
          ] as const
        ).map(([label, count, key]) => (
          <Card
            key={key}
            className={status === key ? 'ring-2 ring-primary' : 'cursor-pointer'}
            onClick={() => setStatus(key)}
          >
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search courses…"
                className="ps-9"
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="updated_at">Recently updated</option>
              <option value="title">Title</option>
              <option value="created_at">Created</option>
              <option value="price">Price</option>
            </Select>
            {selected.size > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void bulk('publish')}>
                  Publish ({selected.size})
                </Button>
                <Button size="sm" variant="outline" onClick={() => void bulk('unpublish')}>
                  Unpublish
                </Button>
                <Button size="sm" variant="outline" onClick={() => void bulk('archive')}>
                  Archive
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void bulk('delete')}>
                  Delete
                </Button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {items.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses found"
              description="Try adjusting filters or create a new course."
              action={
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4" /> Create course
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={selected.size === items.length} onChange={toggleAll} />
                  </TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((course) => (
                  <TableRow key={course.id} data-state={selected.has(course.id) ? 'selected' : undefined}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(course.id)}
                        onChange={() => toggleSelect(course.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-start font-medium hover:text-primary"
                        onClick={() => navigate(`/courses/${course.id}`)}
                      >
                        {course.title}
                      </button>
                      <p className="text-xs text-muted-foreground">{course.title_ar}</p>
                    </TableCell>
                    <TableCell>{course.instructor.full_name}</TableCell>
                    <TableCell className="capitalize">{course.category}</TableCell>
                    <TableCell>{formatPrice(course.price)}</TableCell>
                    <TableCell>{course.total_lessons}</TableCell>
                    <TableCell>
                      <CourseStatusBadge status={course.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(course.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {busy === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" title="Edit" onClick={() => navigate(`/courses/${course.id}`)}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            {course.status !== 'published' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Publish"
                                onClick={() => void runAction(course.id, () => cms.courseAction(course.id, 'publish'))}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {course.status === 'published' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Unpublish"
                                onClick={() => void runAction(course.id, () => cms.courseAction(course.id, 'unpublish'))}
                              >
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Duplicate"
                              onClick={() =>
                                void runAction(course.id, async () => {
                                  const { courseId } = await cms.duplicateCourse(course.id)
                                  navigate(`/courses/${courseId}`)
                                })
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Archive"
                              onClick={() => void runAction(course.id, () => cms.courseAction(course.id, 'archive'))}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Delete"
                              onClick={() => void runAction(course.id, () => cms.deleteCourse(course.id))}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {total > 20 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} · {total} courses
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold">Create course</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Instructor</label>
                  <Select
                    value={createForm.instructorId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, instructorId: e.target.value }))}
                  >
                    <option value="">Select instructor…</option>
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.full_name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input
                  placeholder="Title (EN)"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                />
                <Input
                  placeholder="Title (AR)"
                  value={createForm.title_ar}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title_ar: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button disabled={busy === 'create'} onClick={() => void createCourse()}>
                  {busy === 'create' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
