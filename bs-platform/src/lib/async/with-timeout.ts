/**
 * Report BS-58: put a ceiling on any server-side data call so one slow
 * dependency can never hold the whole page open. Returns `fallback` instead of
 * hanging — the section degrades, the page still renders.
 */
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: T,
  label?: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          if (label) console.warn(`[perf] ${label} exceeded ${ms}ms — degraded`)
          resolve(fallback)
        }, ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
