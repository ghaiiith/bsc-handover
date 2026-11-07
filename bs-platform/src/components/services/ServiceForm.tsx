'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
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
import { saveService } from '@/lib/services/service-actions'
import PortfolioItemsEditor from '@/components/services/PortfolioItemsEditor'
import type { PortfolioItem } from '@/lib/services/service-form-schemas'
import {
  serviceFormSchema,
  type ServiceFormValues,
} from '@/lib/services/service-form-schemas'
import {
  uploadPortfolioImage,
  validatePortfolioCount,
} from '@/lib/storage/portfolio-upload'
import { formatPrice } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceFormProps {
  locale: string
  service?: Service
  /** Instructor revenue share from active agreement (null = no agreement). */
  instructorSharePct?: number | null
  /** Admin-editable revenue-share notice (report BS-24); falls back to i18n. */
  revenueNotice?: string
}

function toDefaults(service?: Service): ServiceFormValues {
  return {
    title: service?.title ?? '',
    title_ar: service?.title_ar ?? '',
    description: service?.description ?? '',
    description_ar: service?.description_ar ?? '',
    category: service?.category ?? SERVICE_CATEGORIES[0].value,
    delivery_days: service?.delivery_days ?? 3,
    price: service?.price ?? 1000,
    portfolio_images: service?.portfolio_images ?? [],
  }
}

export default function ServiceForm({ locale, service, instructorSharePct = null, revenueNotice }: ServiceFormProps) {
  const t = useTranslations('services')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(
    service?.portfolio_images ?? []
  )
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(
    (service?.portfolio_items as PortfolioItem[] | undefined) ?? []
  )
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const isEdit = Boolean(service)
  const isAr = locale === 'ar'

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: toDefaults(service),
  })

  const price = watch('price')
  const sellerEarnings =
    instructorSharePct != null
      ? Math.round(Number(price || 0) * (instructorSharePct / 100))
      : null

  const handleFiles = useCallback((files: FileList | null) => {
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
  }, [portfolioUrls.length, pendingFiles.length, t])

  const removeUrl = (url: string) => {
    setPortfolioUrls((prev) => prev.filter((u) => u !== url))
  }

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = (data: ServiceFormValues) => {
    startTransition(async () => {
      let serviceId = service?.id

      const basePayload = {
        ...data,
        portfolio_images: portfolioUrls,
        portfolio_items: portfolioItems,
      }

      if (!serviceId) {
        const created = await saveService(basePayload, locale)
        if (!created.success || !created.serviceId) {
          toast.error(t('save_error'))
          return
        }
        serviceId = created.serviceId
      }

      const uploaded = [...portfolioUrls]
      for (const file of pendingFiles) {
        if (!validatePortfolioCount(uploaded.length)) break
        const { url, error } = await uploadPortfolioImage(serviceId, file)
        if (error) {
          toast.error(t('upload_error'))
          continue
        }
        if (url) uploaded.push(url)
      }

      const result = await saveService(
        { ...data, portfolio_images: uploaded, portfolio_items: portfolioItems },
        locale,
        serviceId
      )

      if (!result.success) {
        toast.error(t('save_error'))
        return
      }

      toast.success(t('save_success'))
      router.push(`/${locale}/dashboard/my-services`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t('basic_info')}</CardTitle>
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
          <CardTitle>{t('pricing_section')}</CardTitle>
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
              : (revenueNotice?.trim() || t('no_revenue_agreement'))}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('description_section')}</CardTitle>
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
            <p className="text-xs text-end text-muted-foreground">
              {watch('description_ar')?.length ?? 0}/2000
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description_en')}</Label>
            <Textarea
              id="description"
              rows={6}
              maxLength={2000}
              {...register('description')}
            />
            <p className="text-xs text-end text-muted-foreground">
              {watch('description')?.length ?? 0}/2000
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('portfolio')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => document.getElementById('portfolio-input')?.click()}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t('portfolio_upload_hint')}</p>
            <input
              id="portfolio-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {portfolioUrls.map((url) => (
              <div key={url} className="relative h-24 w-24 rounded-md overflow-hidden border">
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

      {/* Structured portfolio entries: title + description + links + images (BS-22) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('portfolio_entries')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioItemsEditor value={portfolioItems} onChange={setPortfolioItems} />
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {isEdit ? t('save_changes') : t('publish_service')}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => router.back()}
        disabled={isPending}
      >
        {tCommon('cancel')}
      </Button>
    </form>
  )
}
