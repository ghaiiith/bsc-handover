'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm, Controller, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IRAQI_CITIES, IRAQI_CITIES_EN } from '@/lib/constants'
import { saveJob } from '@/lib/jobs/admin-job-actions'
import { suggestSkillsFromText } from '@/lib/jobs/skill-vocabulary'
import {
  jobFormSchema,
  COMMON_SKILLS,
  JOB_TYPES,
  type JobFormValues,
} from '@/lib/jobs/job-form-schemas'
import { formatDate } from '@/lib/utils'
import type { Job } from '@/types'

interface AdminJobFormProps {
  locale: string
  job?: Job
  onSave?: (
    values: JobFormValues,
    locale: string,
    jobId?: string
  ) => Promise<{ success?: boolean; error?: string; jobId?: string; pendingReview?: boolean }>
  successRedirect?: string
}

function toFormDefaults(job?: Job): JobFormValues {
  if (!job) {
    return {
      title: '',
      title_ar: '',
      company_name: '',
      city: IRAQI_CITIES[0],
      job_type: 'full_time',
      salary_min: null,
      salary_max: null,
      deadline: null,
      skills: [],
      description: '',
      description_ar: '',
      contact_email: '',
      contact_phone: '',
      contact_link: '',
      whatsapp_number: '',
      publish: true,
    }
  }

  return {
    title: job.title,
    title_ar: job.title_ar,
    company_name: job.company_name,
    city: job.city,
    job_type: job.job_type,
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    deadline: job.deadline ?? null,
    skills: job.skills ?? [],
    description: job.description,
    description_ar: job.description_ar,
    contact_email: job.contact_email ?? '',
    contact_phone: job.contact_phone ?? '',
    contact_link: job.contact_link ?? '',
    whatsapp_number: job.whatsapp_number ?? '',
    publish: job.status === 'active',
  }
}

export default function AdminJobForm({
  locale,
  job,
  onSave,
  successRedirect,
}: AdminJobFormProps) {
  const t = useTranslations('jobs')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [skillInput, setSkillInput] = useState('')
  const isAr = locale === 'ar'
  const isEdit = Boolean(job)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: toFormDefaults(job),
  })

  const skills = watch('skills')

  // Suggest skills derived from the job title + description, backed by a
  // controlled vocabulary (report BS-14). Falls back to the generic common list
  // when the text hasn't produced any matches yet.
  const titleAr = watch('title_ar')
  const titleEn = watch('title')
  const descAr = watch('description_ar')
  const descEn = watch('description')
  const suggestedSkills = useMemo(() => {
    const text = [titleAr, titleEn, descAr, descEn].filter(Boolean).join(' ')
    const derived = suggestSkillsFromText(text, skills)
    if (derived.length > 0) return derived
    return COMMON_SKILLS.filter((s) => !skills.includes(s))
  }, [titleAr, titleEn, descAr, descEn, skills])

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (!trimmed || skills.length >= 15) return
    if (skills.includes(trimmed)) return
    setValue('skills', [...skills, trimmed])
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    setValue(
      'skills',
      skills.filter((s) => s !== skill)
    )
  }

  const onInvalid = (fieldErrors: FieldErrors<JobFormValues>) => {
    const firstKey = Object.keys(fieldErrors)[0] as keyof JobFormValues
    const err = fieldErrors[firstKey]
    const code =
      typeof err?.message === 'string' ? err.message : 'validation_failed'

    const messages: Record<string, string> = {
      contact_required: t('contact_required_error'),
      description_too_short: t('description_too_short'),
      salary_range_invalid: t('salary_range_error'),
      whatsapp_invalid: t('whatsapp_invalid'),
      invalid_url: t('invalid_url_error'),
      unauthorized: t('save_error'),
    }

    toast.error(messages[code] ?? t('form_validation_error'))
  }

  const onSubmit = (values: JobFormValues) => {
    if (!isEdit && values.deadline) {
      const deadline = new Date(values.deadline)
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      if (deadline < today) {
        toast.error(t('deadline_future_error'))
        return
      }
    }

    startTransition(async () => {
      const save = onSave ?? saveJob
      const result = await save(values, locale, job?.id)
      if (result.error) {
        const errorMessages: Record<string, string> = {
          contact_required: t('contact_required_error'),
          unauthorized: t('save_error'),
          missing_db_columns: t('missing_db_columns_error'),
          quota_reached: t('quota_reached_error'),
          profile_incomplete: t('profile_incomplete_error'),
        }
        toast.error(errorMessages[result.error] ?? `${t('save_error')}: ${result.error}`)
        return
      }
      // Report BS-53: a company edit to a live job is held for admin review.
      toast.success(result.pendingReview ? t('pending_review_notice') : t('save_success'))
      router.push(successRedirect ?? `/${locale}/admin/jobs`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 max-w-3xl">
      {isEdit && job?.updated_at && (
        <p className="text-sm text-muted-foreground">
          {t('last_updated')}: {formatDate(job.updated_at, locale)}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('basic_info')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('title_ar')} *</Label>
              <Input {...register('title_ar')} />
              {errors.title_ar && (
                <p className="text-sm text-destructive">{t('title_too_short')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('title_en')} *</Label>
              <Input {...register('title')} />
              {errors.title && (
                <p className="text-sm text-destructive">{t('title_too_short')}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('company_col')} *</Label>
            <Input {...register('company_name')} />
            {errors.company_name && (
              <p className="text-sm text-destructive">{t('company_required')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('filter_city')} *</Label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IRAQI_CITIES.map((cityAr, i) => (
                      <SelectItem key={cityAr} value={cityAr}>
                        {isAr ? cityAr : IRAQI_CITIES_EN[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('job_details_section')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('filter_type')} *</Label>
            <Controller
              name="job_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('salary_min')}</Label>
              <Input
                type="number"
                min={0}
                {...register('salary_min', {
                  setValueAs: (v) =>
                    v === '' || v === null ? null : Number(v),
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('salary_max')}</Label>
              <Input
                type="number"
                min={0}
                {...register('salary_max', {
                  setValueAs: (v) =>
                    v === '' || v === null ? null : Number(v),
                })}
              />
            </div>
          </div>
          {errors.salary_max && (
            <p className="text-sm text-destructive">{t('salary_range_error')}</p>
          )}
          <div className="space-y-2">
            <Label>{t('deadline_col')}</Label>
            <Input type="date" {...register('deadline')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('skills_section')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addSkill(skillInput.replace(',', ''))
              }
            }}
            placeholder={t('skills_input_hint')}
          />
          {suggestedSkills.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('skills_suggested_hint')}</p>
              <div className="flex flex-wrap gap-2">
                {suggestedSkills.map((skill) => (
                  <Button
                    key={skill}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSkill(skill)}
                  >
                    + {skill}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('contact_section')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('contact_section_hint')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('contact_email_label')}</Label>
              <Input type="email" {...register('contact_email')} />
            </div>
            <div className="space-y-2">
              <Label>{t('contact_phone_label')}</Label>
              <Input {...register('contact_phone')} dir="ltr" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('contact_link_label')}</Label>
              <Input type="url" {...register('contact_link')} dir="ltr" placeholder="https://" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('whatsapp_label')}</Label>
              <Input
                {...register('whatsapp_number')}
                dir="ltr"
                placeholder="9647XXXXXXXX"
              />
            </div>
          </div>
          {errors.contact_email && (
            <p className="text-sm text-destructive">{t('contact_required_error')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('description_section')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('description_hint')}</p>
          <div className="space-y-2">
            <Label>{t('description_ar')} *</Label>
            <Textarea rows={6} {...register('description_ar')} />
            {errors.description_ar && (
              <p className="text-sm text-destructive">{t('description_too_short')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('description_en')} *</Label>
            <Textarea rows={6} {...register('description')} />
            {errors.description && (
              <p className="text-sm text-destructive">{t('description_too_short')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label>{t('publish_status')}</Label>
          <Controller
            name="publish"
            control={control}
            render={({ field }) => (
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === true}
                    onChange={() => field.onChange(true)}
                  />
                  {t('publish_now')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === false}
                    onChange={() => field.onChange(false)}
                  />
                  {t('save_draft')}
                </label>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {tCommon('save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${locale}/admin/jobs`)}
        >
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  )
}
