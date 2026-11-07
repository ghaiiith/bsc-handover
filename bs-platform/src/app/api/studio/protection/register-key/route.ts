import { NextResponse } from 'next/server'
import { z } from 'zod'
import { registerLessonEncryptionKey } from '@/lib/video/encryption-keys'
import { logVideoSecurityEvent } from '@/lib/video/security-log'
import { verifyStudioAdmin } from '@/lib/studio/verify-studio-admin'

export const runtime = 'nodejs'

const bodySchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  keyBase64: z.string().min(1),
  ivHex: z.string().regex(/^[0-9a-fA-F]{32}$/),
  encryptionVersion: z.number().int().min(1).optional(),
  processingVersion: z.number().int().min(1).optional(),
})

/**
 * Registers a lesson AES-128 key from BS Platform Studio after processing.
 * Keys are stored server-side only — never uploaded to R2.
 */
export async function POST(request: Request) {
  const admin = await verifyStudioAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const keyBytes = Buffer.from(parsed.keyBase64, 'base64')
  const result = await registerLessonEncryptionKey({
    courseId: parsed.courseId,
    lessonId: parsed.lessonId,
    keyBytes,
    ivHex: parsed.ivHex,
    encryptionVersion: parsed.encryptionVersion,
    processingVersion: parsed.processingVersion,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  await logVideoSecurityEvent({
    eventType: 'asset_validation',
    userId: admin.userId,
    courseId: parsed.courseId,
    lessonId: parsed.lessonId,
    metadata: { action: 'encryption_key_registered' },
  })

  return NextResponse.json({ ok: true })
}
