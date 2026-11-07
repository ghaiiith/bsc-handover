import 'server-only'

import { createHash, timingSafeEqual } from 'crypto'

/** Constant-time secret comparison. Hashing first fixes the length so
 * `timingSafeEqual` never throws and never leaks length via timing. */
export function secretsMatch(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * Validates the `Authorization: Bearer <CRON_SECRET>` header in constant time.
 * Fails closed when `CRON_SECRET` is unset or the header is missing/malformed.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false

  const auth = request.headers.get('authorization')
  if (!auth || !auth.startsWith('Bearer ')) return false

  const token = auth.slice('Bearer '.length)
  return secretsMatch(token, secret)
}
