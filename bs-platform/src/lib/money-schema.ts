import { z } from 'zod'
import { normalizeMoneyAmount } from '@/lib/format-number'

/**
 * Zod helper for whole-dinar IQD prices.
 *
 * Report BS-28: this lives apart from `format-number` on purpose. That module is
 * re-exported by `lib/utils` (which every component imports for `cn`), so a zod
 * import there put the whole of zod — ~27 kB gzipped — into the first load of
 * every page, including the landing page. Only form schemas need it.
 */
export function iqdPriceSchema(min = 0) {
  return z.number().transform(normalizeMoneyAmount).pipe(z.number().min(min))
}
