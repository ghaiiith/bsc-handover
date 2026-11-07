'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Step2Media from '@/components/instructor/wizard/Step2Media'
import { saveCourseStep1 } from '@/lib/instructor/course-wizard-actions'
import { saveCourseStudioInfo } from '@/lib/instructor/studio/studio-actions'
import type { Course, CourseLevel } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const CATEGORIES = [
  'programming',
  'design',
  'business',
  'marketing',
  'language',
  'personal_development',
  'other',
]

interface StudioInformationFormProps {
  locale: string
  course: Course
}

export default function StudioInformationForm({ locale, course }: StudioInformationFormProps) {
  const t = useTranslations('studio.information')
  const ti = useTranslations('instructor')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [form, setForm] = useState({
    title: course.title,
    title_ar: course.title_ar,
    subtitle: course.subtitle ?? '',
    subtitle_ar: course.subtitle_ar ?? '',
    description: course.description ?? '',
    description_ar: course.description_ar ?? '',
    category: course.category,
    subcategory: course.subcategory ?? '',
    level: course.level,
    language: course.language,
    meta_title: course.meta_title ?? '',
    meta_description: course.meta_description ?? '',
    seo_keywords: (course.seo_keywords ?? []).join(', '),
    target_audience: course.target_audience ?? '',
    requirements: course.requirements ?? '',
    learning_outcomes: (course.learning_outcomes ?? []).join('\n'),
  })

  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url ?? null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState(
    course.preview_video_asset_id ?? null
  )
  const [coverImageUrl, setCoverImageUrl] = useState(course.cover_image_url ?? null)

  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'seo' | 'audience'>('general')

  const tabs = [
    { id: 'general' as const, label: t('tabs.general') },
    { id: 'media' as const, label: t('tabs.media') },
    { id: 'seo' as const, label: t('tabs.seo') },
    { id: 'audience' as const, label: t('tabs.audience') },
  ]

  const handleSaveGeneral = () => {
    startTransition(async () => {
      const step1 = await saveCourseStep1(
        {
          title: form.title,
          title_ar: form.title_ar,
          description: form.description,
          description_ar: form.description_ar,
          category: form.category,
          level: form.level as CourseLevel,
          language: form.language as 'ar' | 'en' | 'both',
        },
        course.id,
        locale
      )

      if (!step1.success) {
        toast.error(
          step1.error === 'validation_failed'
            ? ti('create_course_validation')
            : ti('save_error')
        )
        return
      }

      const extended = await saveCourseStudioInfo(course.id, locale, {
        subtitle: form.subtitle || null,
        subtitle_ar: form.subtitle_ar || null,
        subcategory: form.subcategory || null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        seo_keywords: form.seo_keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        target_audience: form.target_audience || null,
        requirements: form.requirements || null,
        learning_outcomes: form.learning_outcomes
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        cover_image_url: coverImageUrl,
        thumbnail_url: thumbnailUrl,
        preview_video_asset_id: previewVideoUrl,
      })

      if (!extended.success) {
        toast.error(ti('save_error'))
        return
      }

      toast.success(t('saved'))
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
          <Card className="edu-card shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t('general_title')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{ti('title_en')}</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{ti('title_ar')}</Label>
                <Input
                  value={form.title_ar}
                  onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('subtitle_en')}</Label>
                <Input
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('subtitle_ar')}</Label>
                <Input
                  value={form.subtitle_ar}
                  onChange={(e) => setForm({ ...form, subtitle_ar: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{ti('description_en')}</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{ti('description_ar')}</Label>
                <Textarea
                  rows={4}
                  value={form.description_ar}
                  onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>{ti('category')}</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => v && setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('subcategory')}</Label>
                <Input
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{ti('level')}</Label>
                <Select
                  value={form.level}
                  onValueChange={(v) => setForm({ ...form, level: v as CourseLevel })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{ti('level_beginner')}</SelectItem>
                    <SelectItem value="intermediate">{ti('level_intermediate')}</SelectItem>
                    <SelectItem value="advanced">{ti('level_advanced')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ti('language')}</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) => v && setForm({ ...form, language: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{ti('language_ar')}</SelectItem>
                    <SelectItem value="en">{ti('language_en')}</SelectItem>
                    <SelectItem value="both">{ti('language_both')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
      )}

      {activeTab === 'media' && (
          <Card className="edu-card shadow-none">
            <CardContent className="pt-6">
              <Step2Media
                locale={locale}
                courseId={course.id}
                thumbnailUrl={thumbnailUrl}
                previewVideoUrl={previewVideoUrl}
                onThumbnailChange={setThumbnailUrl}
                onPreviewVideoChange={setPreviewVideoUrl}
                standalone
                onComplete={() => {}}
              />
              <div className="mt-6 space-y-2">
                <Label>{t('cover_image')}</Label>
                <Input
                  placeholder="https://..."
                  value={coverImageUrl ?? ''}
                  onChange={(e) => setCoverImageUrl(e.target.value || null)}
                />
                <p className="text-xs text-muted-foreground">{t('cover_hint')}</p>
              </div>
            </CardContent>
          </Card>
      )}

      {activeTab === 'seo' && (
          <Card className="edu-card shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t('seo_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('meta_title')}</Label>
                <Input
                  value={form.meta_title}
                  onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('meta_description')}</Label>
                <Textarea
                  rows={3}
                  value={form.meta_description}
                  onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('seo_keywords')}</Label>
                <Input
                  value={form.seo_keywords}
                  onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })}
                  placeholder="react, web development, javascript"
                />
              </div>
            </CardContent>
          </Card>
      )}

      {activeTab === 'audience' && (
          <Card className="edu-card shadow-none">
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>{t('target_audience')}</Label>
                <Textarea
                  rows={3}
                  value={form.target_audience}
                  onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('requirements')}</Label>
                <Textarea
                  rows={3}
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('learning_outcomes')}</Label>
                <Textarea
                  rows={5}
                  value={form.learning_outcomes}
                  onChange={(e) => setForm({ ...form, learning_outcomes: e.target.value })}
                  placeholder={t('outcomes_placeholder')}
                />
              </div>
            </CardContent>
          </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSaveGeneral} disabled={pending} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('save')}
        </Button>
      </div>
    </div>
  )
}
