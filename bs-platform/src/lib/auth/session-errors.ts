/** Auth errors that mean the browser cookie JWT is no longer valid server-side. */
export function isStaleSessionError(message: string | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('user from sub claim in jwt does not exist') ||
    (lower.includes('sub claim') && lower.includes('does not exist')) ||
    lower.includes('user not found')
  )
}

const EXPECTED_UNAUTH_ERRORS = new Set([
  'Auth session missing!',
  'Invalid Refresh Token: Refresh Token Not Found',
  'JWT expired',
])

export function isExpectedUnauthenticatedError(message: string): boolean {
  if (EXPECTED_UNAUTH_ERRORS.has(message)) return true
  if (isStaleSessionError(message)) return true
  return (
    message.includes('Auth session missing') ||
    message.includes('Refresh Token Not Found') ||
    message.includes('JWT expired')
  )
}

/** Transient connectivity failures — not treated as signed-out. */
export function isTransientNetworkError(message: string): boolean {
  return (
    message.includes('fetch failed') ||
    message.includes('Failed to fetch') ||
    message.includes('aborted') ||
    message.includes('signal is aborted') ||
    message.includes('ConnectTimeout') ||
    message.includes('UND_ERR_CONNECT_TIMEOUT') ||
    message.includes('ENOTFOUND') ||
    message.includes('Supabase request timed out') ||
    message.includes('TimeoutError')
  )
}
