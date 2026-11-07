// Bounded fetch for all Supabase clients.
//
// supabase-js/@supabase/ssr default to the platform fetch (undici on Node),
// whose connect timeout is ~10s and which retries multiple resolved addresses.
// When the Supabase edge is unreachable, a single PostgREST/Auth call can hang
// for tens of seconds (observed: GET /api/discounts/active-count in 48s), which
// stalls the request that awaits it. Wrapping fetch with an AbortController caps
// every Supabase network call so a slow/unreachable backend fails fast instead
// of blocking a page or API route. This also protects production against a slow
// upstream — not just local connectivity loss.

const DEFAULT_TIMEOUT_MS = 8_000
const TIMEOUT_REASON = 'Supabase request timed out'

function timeoutAbortReason(): string | DOMException {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(TIMEOUT_REASON, 'TimeoutError')
  }
  return TIMEOUT_REASON
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === 'AbortError'
  if (error instanceof Error) return error.name === 'AbortError'
  return false
}

/** Map AbortError to the same shape Node uses for unreachable hosts. */
function normalizeFetchError(error: unknown): Error {
  if (isAbortError(error)) {
    return new TypeError('fetch failed')
  }
  return error instanceof Error ? error : new TypeError('fetch failed')
}

export function createTimeoutFetch(timeoutMs: number = DEFAULT_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(timeoutAbortReason()), timeoutMs)

    // Respect a caller-provided signal by aborting our controller when it fires.
    const callerSignal = init?.signal
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort(callerSignal.reason)
      else {
        callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), {
          once: true,
        })
      }
    }

    return fetch(input, { ...init, signal: controller.signal })
      .catch((error: unknown) => {
        throw normalizeFetchError(error)
      })
      .finally(() => clearTimeout(timer))
  }
}
