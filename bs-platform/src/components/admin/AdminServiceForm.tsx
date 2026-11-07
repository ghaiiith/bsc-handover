'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm, Controller, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Image from 'next/image'
import { Loader2, Upload, X } from 'lucide-react'
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
import {
  SERVICE_CATEGORIES,
  MAX_PORTFOLIO_IMAGES,
} from '@/lib/constants'
import { saveAdminService } from '@/lib/admin/admin-service-actions'
import { uploadAdminPortfolioImage } from '@/lib/admin/upload-portfolio'
import {
  adminServiceFormSchema,
  type AdminServiceFormValues,
} from '@/lib/admin/admin-service-form-schemas'
import {
  uploadPortfolioImage,
  validatePortfolioCount,
} from '@/lib/storage/portfolio-upload'
import { formatPrice } from '@/lib/utils'
import type { Service } from '@/types'

interface AdminServiceFormProps {
  locale: string
  service?: Service
}

function toDefaults(service?: Service): AdminServiceFormValues {
  return {
    title: service?.title ?? '',
    title_ar: service?.title_ar ?? '',
    description: service?.description ?? '',
    description_ar: service?.description_ar ?? '',
    category: service?.category ?? SERVICE_CATEGORIES[0].value,
    delivery_days: service?.delivery_days ?? 3,
    price: service?.price ?? 1000,
    portfolio_images: service?.portfolio_images ?? [],
    contact_email: service?.contact_email ?? '',
    contact_phone: service?.contact_phone ?? '',
    contact_link: service?.contact_link ?? '',
    whatsapp_number: service?.whatsapp_number ?? '',
    publish: service ? service.status === 'active' : true,
  }
}

export default function AdminServiceForm({ locale, service }: AdminServiceFormProps) {
  const t = useTranslations('services')
  const tAdmin = useTranslations('admin')
  const tJobs = useTranslations('jobs')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(
    service?.portfolio_images ?? []
  )
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const isEdit = Boolean(service)
  const isAr = locale === 'ar'

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdminServiceFormValues>({
    resolver: zodResolver(adminServiceFormSchema),
    defaultValues: toDefaults(service),
  })

  const price = watch('price')
  const sellerEarnings = null

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      const total = portfolioUrls.length + pendingFiles.length
      const incoming = Array.from(files)
      const allowed = incoming.filter((f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
      )
      const room = MAX_PORTFOLIO_IMAGES - total
      if (room <= 0) {
        toast.error(t('portfolio_max'))
        return
      }
      setPendingFiles((prev) => [...prev, ...allowed.slice(0, room)])
    },
    [portfolioUrls.length, pendingFiles.length, t]
  )

  const removeUrl = (url: string) => {
    setPortfolioUrls((prev) => prev.filter((u) => u !== url))
  }

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onInvalid = (fieldErrors: FieldErrors<AdminServiceFormValues>) => {
    const firstKey = Object.keys(fieldErrors)[0] as keyof AdminServiceFormValues
    const err = fieldErrors[firstKey]
    const code =
      typeof err?.message === 'string' ? err.message : 'validation_failed'

    const messages: Record<string, string> = {
      contact_required: tJobs('contact_required_error'),
      whatsapp_invalid: tJobs('whatsapp_invalid'),
      invalid_url: tJobs('invalid_url_error'),
      title_too_short: t('title_ar_error'),
      description_too_short: t('description_too_short'),
    }

    toast.error(messages[code] ?? t('form_validation_error'))
  }

  const onSubmit = (data: AdminServiceFormValues) => {
    startTransition(async () => {
      let serviceId = service?.id

      if (!serviceId) {
        const created = await saveAdminService(
          { ...data, portfolio_images: portfolioUrls },
          locale
        )
        if (!created.success || !created.serviceId) {
          if (created.error === 'missing_db_columns') {
            toast.error(tAdmin('missing_db_columns_error'))
          } else if (created.error === 'unauthorized') {
            toast.error(t('save_error'))
          } else if (created.error === 'title_too_short' || created.error === 'description_too_short') {
            toast.error(
              created.error === 'title_too_short'
                ? t('title_ar_error')
                : t('description_too_short')
            )
          } else {
            toast.error(t('save_error'))
          }
          return
        }
        serviceId = created.serviceId
      }

      const uploaded = [...portfolioUrls]
      for (const file of pendingFiles) {
        if (!validatePortfolioCount(uploaded.length)) break

        const formData = new FormData()
        formData.append('file', file)

        let url: string | null = null
        let error: string | undefined

        const adminUpload = await uploadAdminPortfolioImage(serviceId, formData)
        if (adminUpload.url) {
          url = adminUpload.url
        } else {
          const fallback = await uploadPortfolioImage(serviceId, file)
          url = fallback.url
          error = fallback.error
        }

        if (error || !url) {
          toast.error(t('upload_error'))
          continue
        }
        uploaded.push(url)
      }

      const result = await saveAdminService(
        { ...data, portfolio_images: uploaded },
        locale,
        serviceId
      )

      if (!result.success) {
        if (result.error === 'missing_db_columns') {
          toast.error(tAdmin('missing_db_columns_error'))
        } else if (result.error === 'title_too_short' || result.error === 'description_too_short') {
          toast.error(
            result.error === 'title_too_short'
              ? t('title_ar_error')
              : t('description_too_short')
          )
        } else {
          toast.error(t('save_error'))
        }
        return
      }

      if (result.missingColumns) {
        toast.warning(tAdmin('service_saved_without_contact'))
      }

      toast.success(t('save_success'))
      router.push(`/${locale}/admin/services`)
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="space-y-6 max-w-3xl"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('basic_info')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title_ar">{t('title_ar')}</Label>
            <Input id="title_ar" {...register('title_ar')} dir="rtl" />
            {errors.title_ar && (
              <p className="text-xs text-destructive">{t('title_ar_error')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">{t('title_en')}</Label>
            <Input id="title" {...register('title')} />
            {errors.title && (
              <p className="text-xs text-destructive">{t('title_en_error')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('filter_category')}</Label>
            <Select
              value={watch('category')}
              onValueChange={(v) => v && setValue('category', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {isAr ? cat.label : cat.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery_days">{t('delivery_days')}</Label>
            <Input
              id="delivery_days"
              type="number"
              min={1}
              max={90}
              {...register('delivery_days', { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('pricing_section')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="price">{t('price_iqd')}</Label>
          <Input
            id="price"
            type="number"
            min={1000}
            step={1}
            inputMode="numeric"
            {...register('price', { valueAsNumber: true })}
          />
          <p className="text-sm text-muted-foreground">
            {sellerEarnings != null
              ? t('commission_hint', { amount: formatPrice(sellerEarnings) })
              : t('no_revenue_agreement')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tJobs('contact_section')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {tAdmin('service_contact_hint')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tJobs('contact_email_label')}</Label>
              <Input type="email" {...register('contact_email')} />
            </div>
            <div className="space-y-2">
              <Label>{tJobs('contact_phone_label')}</Label>
              <Input {...register('contact_phone')} dir="ltr" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{tJobs('contact_link_label')}</Label>
              <Input
                type="url"
                {...register('contact_link')}
                dir="ltr"
                placeholder="https://"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{tJobs('whatsapp_label')}</Label>
              <Input
                {...register('whatsapp_number')}
                dir="ltr"
                placeholder="9647XXXXXXXX"
              />
            </div>
          </div>
          {errors.contact_email && (
            <p className="text-sm text-destructive">
              {tJobs('contact_required_error')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('description_section')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description_ar">{t('description_ar')}</Label>
            <Textarea
              id="description_ar"
              rows={6}
              dir="rtl"
              maxLength={2000}
              {...register('description_ar')}
            />
            {errors.description_ar && (
              <p className="text-xs text-destructive">{t('description_too_short')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description_en')}</Label>
            <Textarea
              id="description"
              rows={6}
              maxLength={2000}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{t('description_too_short')}</p>
            )}
            <p className="text-xs text-muted-foreground">{t('description_min_hint')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('portfolio')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => document.getElementById('admin-portfolio-input')?.click()}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t('portfolio_upload_hint')}</p>
            <input
              id="admin-portfolio-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {portfolioUrls.map((url) => (
              <div
                key={url}
                className="relative h-24 w-24 rounded-md overflow-hidden border"
              >
                <Image src={url} alt="" fill className="object-cover" sizes="96px" />
                <button
                  type="button"
                  className="absolute top-1 end-1 rounded-full bg-background/80 p-0.5"
                  onClick={() => removeUrl(url)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {pendingFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative h-24 w-24 rounded-md overflow-hidden border flex items-center justify-center bg-muted text-xs p-1 text-center"
              >
                {file.name}
                <button
                  type="button"
                  className="absolute top-1 end-1 rounded-full bg-background/80 p-0.5"
                  onClick={() => removePending(i)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label>{tAdmin('publish_status')}</Label>
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
                  {tAdmin('publish_service_now')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={field.value === false}
                    onChange={() => field.onChange(false)}
                  />
                  {tAdmin('save_service_paused')}
                </label>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isEdit ? t('save_changes') : tAdmin('create_service')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${locale}/admin/services`)}
        >
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  )
}
