'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, Loader2, Search, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCourseCategories } from '@/components/categories/CourseCategoriesProvider'
import { cn } from '@/lib/utils'
import { step1Schema } from '@/lib/instructor/course-wizard-schemas'
import {
  createCourseForInstructor,
  getSelectableInstructors,
  type SelectableInstructor,
} from '@/lib/admin/admin-course-actions-create'

interface AdminCreateCourseFormProps {
  locale: string
  initialInstructors: SelectableInstructor[]
}

type Level = 'beginner' | 'intermediate' | 'advanced'
type Language = 'ar' | 'en' | 'both'

export default function AdminCreateCourseForm({
  locale,
  initialInstructors,
}: AdminCreateCourseFormProps) {
  const t = useTranslations('admin')
  const categories = useCourseCategories()
  const router = useRouter()
  const isAr = locale === 'ar'
  const [isPending, startTransition] = useTransition()

  const [instructors, setInstructors] = useState(initialInstructors)
  const [instructorId, setInstructorId] = useState<string | null>(null)
  const [instructorQuery, setInstructorQuery] = useState('')

  const [form, setForm] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    category: '',
    level: 'beginner' as Level,
    language: 'ar' as Language,
  })

  const selectedInstructor = instructors.find((i) => i.id === instructorId)

  const searchInstructors = () => {
    startTransition(async () => {
      const results = await getSelectableInstructors(instructorQuery)
      setInstructors(results)
    })
  }

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const submit = () => {
    if (!instructorId) {
      toast.error(t('select_instructor'))
      return
    }

    const parsed = step1Schema.safeParse(form)
    if (!parsed.success) {
      toast.error(t('create_course_validation'))
      return
    }

    startTransition(async () => {
      const result = await createCourseForInstructor(instructorId, parsed.data, locale)
      if (!result.success || !result.courseId) {
        toast.error(t('create_course_error'))
        return
      }
      toast.success(t('course_created'))
      router.push(`/${locale}/instructor/courses/${result.courseId}/studio`)
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('select_instructor')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={instructorQuery}
              onChange={(e) => setInstructorQuery(e.target.value)}
              placeholder={t('search_instructors')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  searchInstructors()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={searchInstructors} disabled={isPending}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto">
            {instructors.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('no_instructors_found')}
              </p>
            ) : (
              instructors.map((instructor) => {
                const name = isAr
                  ? instructor.full_name_ar ?? instructor.full_name
                  : instructor.full_name
                const active = instructor.id === instructorId
                return (
                  <button
                    key={instructor.id}
                    type="button"
                    onClick={() => setInstructorId(instructor.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-start text-sm transition-colors',
                      active
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-1 flex-1">{name}</span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                )
              })
            )}
          </div>

          {selectedInstructor && (
            <p className="text-xs text-muted-foreground">
              {t('creating_for', {
                name: isAr
                  ? selectedInstructor.full_name_ar ?? selectedInstructor.full_name
                  : selectedInstructor.full_name,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('course_details')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('course_title_ar')}</Label>
            <Input
              value={form.title_ar}
              onChange={(e) => update('title_ar', e.target.value)}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('course_title_en')}</Label>
            <Input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('course_description_ar')}</Label>
            <Textarea
              value={form.description_ar}
              onChange={(e) => update('description_ar', e.target.value)}
              rows={3}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('course_description_en')}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              dir="ltr"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('category_column')}</Label>
              <Select
                value={form.category}
                onValueChange={(value) => update('category', value ?? '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_category')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {isAr ? c.label : c.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('course_level')}</Label>
              <Select
                value={form.level}
                onValueChange={(value) => update('level', (value ?? 'beginner') as Level)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">{t('level_beginner')}</SelectItem>
                  <SelectItem value="intermediate">{t('level_intermediate')}</SelectItem>
                  <SelectItem value="advanced">{t('level_advanced')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('course_language')}</Label>
              <Select
                value={form.language}
                onValueChange={(value) => update('language', (value ?? 'ar') as Language)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{t('lang_ar')}</SelectItem>
                  <SelectItem value="en">{t('lang_en')}</SelectItem>
                  <SelectItem value="both">{t('lang_both')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={submit} disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('create_and_continue')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
