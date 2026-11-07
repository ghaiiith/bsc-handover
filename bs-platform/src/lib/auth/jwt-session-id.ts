/**
 * Isomorphic reader for the GoTrue `session_id` claim inside an access token.
 *
 * Runs in the browser (no `node:` imports) so the login form can pull the fresh
 * session id straight out of the token `signInWithPassword` just returned —
 * before the auth cookie has finished propagating — and hand it to the
 * single-session server action. See `establishSingleSession` for why blessing the
 * client-supplied id (instead of re-reading the racing cookie server-side) is
 * what stops a fresh login from superseding itself (report BS-04).
 */
export function readSessionIdFromToken(
  accessToken: string | null | undefined
): string | null {
  if (!accessToken) return null
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8')
    const claims = JSON.parse(json) as { session_id?: unknown }
    return typeof claims.session_id === 'string' && claims.session_id
      ? claims.session_id
      : null
  } catch {
    return null
  }
}
