import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EncryptionStatus } from '@/types/content-protection'

const KEY_LENGTH = 16
const WRAP_ALGORITHM = 'aes-256-gcm'
const WRAP_IV_LENGTH = 12
const TAG_LENGTH = 16

function getMasterKey(): Buffer {
  const secret = process.env.VIDEO_KEY_MASTER_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('VIDEO_KEY_MASTER_SECRET must be set (min 32 chars)')
  }
  return createHash('sha256').update(secret).digest()
}

export function generateAes128Key(): Buffer {
  return randomBytes(KEY_LENGTH)
}

export function generateIvHex(): string {
  return randomBytes(16).toString('hex')
}

function wrapKey(plainKey: Buffer): string {
  const wrapIv = randomBytes(WRAP_IV_LENGTH)
  const cipher = createCipheriv(WRAP_ALGORITHM, getMasterKey(), wrapIv)
  const encrypted = Buffer.concat([cipher.update(plainKey), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([wrapIv, tag, encrypted]).toString('base64')
}

function unwrapKey(ciphertextB64: string): Buffer {
  const payload = Buffer.from(ciphertextB64, 'base64')
  const wrapIv = payload.subarray(0, WRAP_IV_LENGTH)
  const tag = payload.subarray(WRAP_IV_LENGTH, WRAP_IV_LENGTH + TAG_LENGTH)
  const encrypted = payload.subarray(WRAP_IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(WRAP_ALGORITHM, getMasterKey(), wrapIv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

export interface RegisterLessonKeyInput {
  courseId: string
  lessonId: string
  keyBytes: Buffer
  ivHex: string
  encryptionVersion?: number
  processingVersion?: number
}

/** Stores a lesson encryption key server-side. Never uploads to R2. */
export async function registerLessonEncryptionKey(
  input: RegisterLessonKeyInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.keyBytes.length !== KEY_LENGTH) {
    return { ok: false, error: 'invalid_key_length' }
  }

  const admin = createAdminClient()

  const { error: keyError } = await admin.from('lesson_encryption_keys').upsert(
    {
      course_id: input.courseId,
      lesson_id: input.lessonId,
      key_ciphertext: wrapKey(input.keyBytes),
      iv_hex: input.ivHex,
      encryption_method: 'aes-128',
      encryption_version: input.encryptionVersion ?? 1,
      processing_version: input.processingVersion ?? 1,
      rotated_at: new Date().toISOString(),
    },
    { onConflict: 'lesson_id' }
  )

  if (keyError) {
    return { ok: false, error: keyError.message }
  }

  const { error: protectionError } = await admin.from('lesson_content_protection').upsert(
    {
      lesson_id: input.lessonId,
      course_id: input.courseId,
      encryption_status: 'encrypted' satisfies EncryptionStatus,
      protection_status: 'protected',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'lesson_id' }
  )

  if (protectionError) {
    return { ok: false, error: protectionError.message }
  }

  return { ok: true }
}

export async function getLessonEncryptionKey(
  courseId: string,
  lessonId: string
): Promise<{ key: Buffer; ivHex: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('lesson_encryption_keys')
    .select('key_ciphertext, iv_hex, course_id')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (!data || data.course_id !== courseId) return null

  try {
    const key = unwrapKey(data.key_ciphertext as string)
    return { key, ivHex: data.iv_hex as string }
  } catch {
    return null
  }
}

export async function isLessonEncrypted(
  courseId: string,
  lessonId: string
): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('lesson_content_protection')
    .select('encryption_status')
    .eq('lesson_id', lessonId)
    .eq('course_id', courseId)
    .maybeSingle()

  return data?.encryption_status === 'encrypted'
}
