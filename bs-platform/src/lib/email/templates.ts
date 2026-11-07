import { getAppUrl } from '@/lib/seo/metadata'
import { emailButton, emailLayout } from '@/lib/email'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'

interface WelcomeEmailParams {
  name: string
  locale?: string
}

export function buildWelcomeEmail({ name, locale = 'ar' }: WelcomeEmailParams) {
  const appUrl = getAppUrl()
  const coursesUrl = `${appUrl}/${locale}/courses`

  return {
    subject: `أهلاً بك في ${BRAND_FULL_NAME}! / Welcome to ${BRAND_FULL_NAME}!`,
    html: emailLayout(`
      <h2>أهلاً ${name}! 👋</h2>
      <p>مرحباً بك في <strong>${BRAND_FULL_NAME}</strong> — منصة ثنائية اللغة للتعليم والعمل والنمو المهني.</p>
      <ul>
        <li>📚 كورسات تعليمية من مدربين محترفين</li>
        <li>💼 فرص عمل حقيقية</li>
        <li>🛠️ سوق خدمات مهنية</li>
      </ul>
      ${emailButton(coursesUrl, 'ابدأ الآن')}
      <hr>
      <h3>Welcome ${name}!</h3>
      <p>Your gateway to courses, jobs, and professional services in Iraq.</p>
      ${emailButton(coursesUrl, 'Get Started')}
    `),
  }
}

interface PaymentConfirmationParams {
  courseTitle: string
  thumbnailUrl?: string | null
  lessonUrl: string
  locale?: string
}

export function buildPaymentConfirmationEmail({
  courseTitle,
  thumbnailUrl,
  lessonUrl,
}: PaymentConfirmationParams) {
  const thumb = thumbnailUrl
    ? `<img src="${thumbnailUrl}" alt="${courseTitle}" style="max-width:100%;border-radius:8px;margin:16px 0;" />`
    : ''

  return {
    subject: `تم تسجيلك بنجاح في ${courseTitle}`,
    html: emailLayout(`
      <h2>تم التسجيل بنجاح! ✅</h2>
      <p>تم تسجيلك في الكورس:</p>
      <h3>${courseTitle}</h3>
      ${thumb}
      ${emailButton(lessonUrl, 'ابدأ التعلم الآن')}
      <p style="font-size:14px;color:#666;">للدعم: support@bs-platform.com</p>
    `),
  }
}

interface CourseApprovedEmailParams {
  courseTitle: string
  courseUrl: string
}

export function buildCourseApprovedEmail({
  courseTitle,
  courseUrl,
}: CourseApprovedEmailParams) {
  return {
    subject: `تم نشر كورسك ${courseTitle}!`,
    html: emailLayout(`
      <h2>مبروك! 🎉</h2>
      <p>تم نشر كورسك <strong>${courseTitle}</strong> بنجاح على منصة ${BRAND_FULL_NAME}.</p>
      ${emailButton(courseUrl, 'عرض الكورس')}
      <p style="font-size:14px;color:#666;">💡 شارك كورسك مع أصدقائك لزيادة المبيعات!</p>
    `),
  }
}

interface CourseRejectedEmailParams {
  courseTitle: string
  rejectionNote: string
  editUrl: string
}

export function buildCourseRejectedEmail({
  courseTitle,
  rejectionNote,
  editUrl,
}: CourseRejectedEmailParams) {
  return {
    subject: `تحديث بخصوص كورسك ${courseTitle}`,
    html: emailLayout(`
      <h2>تحديث بخصوص كورسك</h2>
      <p>للأسف، لم يتم قبول كورسك <strong>${courseTitle}</strong> في الوقت الحالي.</p>
      <p><strong>السبب:</strong> ${rejectionNote}</p>
      ${emailButton(editUrl, 'تعديل الكورس وإعادة الإرسال')}
    `),
  }
}

interface InstructorApprovedEmailParams {
  coursesNewUrl: string
}

export function buildInstructorApprovedEmail({
  coursesNewUrl,
}: InstructorApprovedEmailParams) {
  return {
    subject: `تهانينا! أصبحت مدرباً في ${BRAND_FULL_NAME}`,
    html: emailLayout(`
      <h2>تهانينا! 🎓</h2>
      <p>تمت الموافقة على طلبك وأصبحت مدرباً معتمداً في ${BRAND_FULL_NAME}.</p>
      <p>يمكنك الآن إنشاء ونشر كورساتك التعليمية.</p>
      ${emailButton(coursesNewUrl, 'ابدأ بإنشاء أول كورس')}
    `),
  }
}

interface ServiceOrderAdminEmailParams {
  serviceTitle: string
  buyerName: string
  requirements: string
  adminUrl: string
}

export function buildServiceOrderAdminEmail({
  serviceTitle,
  buyerName,
  requirements,
  adminUrl,
}: ServiceOrderAdminEmailParams) {
  const summary =
    requirements.length > 200 ? `${requirements.slice(0, 200)}…` : requirements

  return {
    subject: `طلب خدمة جديد: ${serviceTitle}`,
    html: emailLayout(`
      <h2>طلب خدمة جديد 📋</h2>
      <p><strong>الخدمة:</strong> ${serviceTitle}</p>
      <p><strong>المشتري:</strong> ${buyerName}</p>
      <p><strong>المتطلبات:</strong> ${summary}</p>
      ${emailButton(adminUrl, 'عرض الطلب')}
    `),
  }
}
