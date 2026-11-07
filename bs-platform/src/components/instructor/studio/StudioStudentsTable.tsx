'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { StudioStudentRow } from '@/lib/instructor/studio/get-course-studio-data'
import { formatCount } from '@/lib/format-number'
import { formatDate } from '@/lib/utils'

interface StudioStudentsTableProps {
  locale: string
  students: StudioStudentRow[]
}

type Filter = 'all' | 'active' | 'inactive' | 'completed' | 'at_risk'

export default function StudioStudentsTable({ locale, students }: StudioStudentsTableProps) {
  const t = useTranslations('studio.students')
  const isAr = locale === 'ar'
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return students
    return students.filter((s) => s.status === filter)
  }, [students, filter])

  const filters: Filter[] = ['all', 'active', 'inactive', 'completed', 'at_risk']

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`filters.${f}`)}
          </button>
        ))}
      </div>

      <div className="edu-card overflow-hidden shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('progress')}</TableHead>
              <TableHead>{t('enrolled')}</TableHead>
              <TableHead>{t('last_activity')}</TableHead>
              <TableHead>{t('status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const name = isAr
                  ? row.student.full_name_ar ?? row.student.full_name
                  : row.student.full_name
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={row.student.avatar_url ?? ''} />
                          <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <Progress value={row.progressPercent} className="h-2 flex-1" />
                        <span className="text-xs num-en w-8">{formatCount(row.progressPercent)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm num-en">
                      {formatDate(row.enrolledAt, locale)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.lastActivity
                        ? formatDate(row.lastActivity, locale)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t(`status_${row.status}`)}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
