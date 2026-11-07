// AES-128 HLS encryption for the worker. Mirrors src/lib/video/encryption-keys.ts:
// a random 16-byte content key + IV encrypt the segments; the key is envelope-
// wrapped (AES-256-GCM under SHA-256(VIDEO_KEY_MASTER_SECRET)) before it is
// stored in the DB. The key file is fed to FFmpeg locally and is NEVER uploaded
// to R2 — playback fetches it from the authenticated /playback/key endpoint.

import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from './env.mjs'

const KEY_LENGTH = 16
const WRAP_ALGORITHM = 'aes-256-gcm'
const WRAP_IV_LENGTH = 12

function masterKey() {
  const secret = process.env.VIDEO_KEY_MASTER_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('VIDEO_KEY_MASTER_SECRET must be set (min 32 chars) to encrypt HLS')
  }
  return createHash('sha256').update(secret).digest()
}

export function wrapKey(plainKey) {
  const iv = randomBytes(WRAP_IV_LENGTH)
  const cipher = createCipheriv(WRAP_ALGORITHM, masterKey(), iv)
  const enc = Buffer.concat([cipher.update(plainKey), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

/**
 * Generate a content key + IV and write the FFmpeg keyinfo file.
 * keyinfo line 1 is the URI written verbatim into each variant playlist's
 * #EXT-X-KEY; the HLS proxy rewrites it to the authenticated key endpoint
 * (rewriteEncryptedPlaylist), so a fixed placeholder is fine.
 */
export async function prepareEncryption(jobDir) {
  if (env.encryptHls === false) return null
  const key = randomBytes(KEY_LENGTH)
  const ivHex = randomBytes(KEY_LENGTH).toString('hex')
  const keyPath = path.join(jobDir, 'enc.key')
  const keyInfoPath = path.join(jobDir, 'keyinfo.txt')
  await writeFile(keyPath, key)
  // URI (placeholder, rewritten by proxy) \n local key path \n IV hex
  await writeFile(keyInfoPath, `key\n${keyPath}\n${ivHex}\n`)
  return { key, ivHex, keyInfoPath, wrappedKey: wrapKey(key) }
}
