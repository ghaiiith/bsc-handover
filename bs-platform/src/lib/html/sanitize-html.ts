/**
 * Shared HTML hardening for content that is authored (or generated) elsewhere
 * and later injected into a page: portfolio templates (BS-35) and trainer
 * lesson notes (BS-31). Removes everything executable while leaving normal
 * formatting markup alone.
 */

export function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/<(iframe|object|embed|base)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(iframe|object|embed|base)\b[^>]*\/?>/gi, '')
    .replace(/<form\b/gi, '<div')
    .replace(/<\/form\s*>/gi, '</div>')
    // on*="…" / on*='…' / on*=…
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '')
}

/** Trainer notes: hardened and length-capped. */
export const MAX_RICH_TEXT_CHARS = 100_000

export function sanitizeRichText(html: string): string {
  return stripUnsafeHtml(html).slice(0, MAX_RICH_TEXT_CHARS)
}
