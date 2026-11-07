import { Resend } from 'resend'
import { BRAND_FULL_NAME, BRAND_ORANGE, BRAND_TEAL } from '@/lib/brand/constants'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? `${BRAND_FULL_NAME} <noreply@bs-platform.com>`

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export async function sendEmail(
  input: SendEmailInput
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()
  if (!resend) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[email] RESEND_API_KEY not set — skipping email to', input.to)
    }
    return { success: false, error: 'not_configured' }
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })

    if (error) {
      console.error('[email] Send failed:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[email] Unexpected error:', err)
    return { success: false, error: 'unexpected_error' }
  }
}

export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND_ORANGE};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">${label}</a>`
}

export function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <strong style="font-size:24px;color:${BRAND_TEAL};">${BRAND_FULL_NAME}</strong>
  </div>
  ${content}
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;">
  <p style="font-size:12px;color:#888;text-align:center;">© ${new Date().getFullYear()} ${BRAND_FULL_NAME}. جميع الحقوق محفوظة.</p>
</body>
</html>`
}
