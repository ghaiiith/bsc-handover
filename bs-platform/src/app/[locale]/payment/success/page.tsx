import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { CheckCircle2, BookOpen, Briefcase } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { buildLearnLessonPath } from '@/lib/courses/course-slug'
import { getCourseDetail } from '@/lib/courses/get-course-detail'

interface PaymentSuccessPageProps {
  searchParams: Promise<{
    courseId?: string
    orderId?: string
    type?: string
  }>
}

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const locale = await getLocale()
  const tPayment = await getTranslations('payment')
  const tServices = await getTranslations('services')
  const tNav = await getTranslations('nav')
  const { courseId, orderId, type } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  if (type === 'subscription') {
    const isAr = locale === 'ar'
    return (
      <div className="min-h-screen bg-muted/20">
        <Navbar />
        <div className="container mx-auto max-w-lg space-y-8 px-4 py-16 text-center">
          <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-500 animate-in zoom-in-50 duration-500" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {isAr ? 'تم تفعيل اشتراكك' : 'Your subscription is active'}
            </h1>
            <p className="text-muted-foreground">
              {isAr
                ? 'تقدر الآن تنشر الوظائف ضمن حد باقتك.'
                : 'You can now post jobs up to your plan limit.'}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link href={`/${locale}/dashboard/subscription`} className={cn(buttonVariants({ variant: 'outline' }))}>
              {isAr ? 'إدارة الاشتراك' : 'Manage subscription'}
            </Link>
            <Link href={`/${locale}/dashboard/company-jobs/new`} className={cn(buttonVariants())}>
              {isAr ? 'نشر وظيفة' : 'Post a job'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'service' && orderId) {
    const { data: order } = await supabase
      .from('service_orders')
      .select(`
        id,
        buyer_id,
        service:services(id, title, title_ar, price, portfolio_images)
      `)
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .maybeSingle()

    if (!order) {
      redirect(`/${locale}/services`)
    }

    const service = Array.isArray(order.service) ? order.service[0] : order.service
    if (!service) redirect(`/${locale}/services`)

    const isAr = locale === 'ar'
    const title = isAr ? service.title_ar : service.title
    const portfolioImage = service.portfolio_images?.[0]

    return (
      <div className="min-h-screen bg-muted/20">
        <Navbar />

        <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-8">
          <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-500 animate-in zoom-in-50 duration-500" />

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{tServices('order_sent')}</h1>
            <p className="text-muted-foreground">{tServices('seller_will_contact')}</p>
          </div>

          <div className="rounded-xl border bg-card p-4 flex items-center gap-4 text-start">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
              {portfolioImage ? (
                <Image
                  src={portfolioImage}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold line-clamp-2">{title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatPrice(service.price)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/${locale}/dashboard/orders/${orderId}`}
              className={cn(buttonVariants({ size: 'lg' }))}
            >
              {tServices('view_order')}
            </Link>
            <Link
              href={`/${locale}/dashboard/orders/my-orders`}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              {tServices('my_orders')}
            </Link>
            <Link
              href={`/${locale}/services`}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              {tNav('services')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!courseId) {
    redirect(`/${locale}/courses`)
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!enrollment) {
    redirect(`/${locale}/courses`)
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title, title_ar, thumbnail_url')
    .eq('id', courseId)
    .single()

  if (!course) {
    redirect(`/${locale}/courses`)
  }

  const detail = await getCourseDetail(courseId)
  const firstLessonSlug = detail?.firstLessonSlug

  const isAr = locale === 'ar'
  const title = isAr ? course.title_ar : course.title
  const learnHref =
    firstLessonSlug && course.slug
      ? buildLearnLessonPath(locale, course.slug, firstLessonSlug)
      : `/${locale}/dashboard/my-courses`

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-8">
        <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-500 animate-in zoom-in-50 duration-500" />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{tPayment('success_title')}</h1>
          <p className="text-muted-foreground">{tPayment('success_msg')}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 flex items-center gap-4 text-start">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
            {course.thumbnail_url ? (
              <Image
                src={course.thumbnail_url}
                alt={title}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <p className="font-semibold line-clamp-2">{title}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={learnHref} className={cn(buttonVariants({ size: 'lg' }))}>
            {tPayment('start_learning')}
          </Link>
          <Link
            href={`/${locale}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
          >
            {tNav('home')}
          </Link>
        </div>
      </div>
    </div>
  )
}
