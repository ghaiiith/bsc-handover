/**
 * Report BS-35: uploaded portfolio templates are HTML files an admin found or
 * authored elsewhere, so they are cleaned before they are ever stored or
 * rendered. Profile data is escaped by the engine; this covers the template
 * markup itself.
 */

import { stripUnsafeHtml } from '@/lib/html/sanitize-html'

/** Hard cap so one template cannot bloat every portfolio render. */
export const MAX_TEMPLATE_BYTES = 512 * 1024

/**
 * Removes anything executable: <script>, inline event handlers, `javascript:`
 * URLs, <iframe>/<object>/<embed>, and <form> actions.
 */
export function sanitizeTemplateHtml(html: string): string {
  return stripUnsafeHtml(html)
}

export interface SplitTemplate {
  /** Contents of every <style> block, concatenated. */
  css: string
  /** Everything inside <body>, or the whole document if there is no <body>. */
  body: string
}

/**
 * Splits a standalone HTML document into inline CSS plus body markup so it can
 * be rendered inside the app shell instead of replacing the whole document.
 */
export function splitTemplate(html: string): SplitTemplate {
  const styles: string[] = []
  const withoutStyles = html.replace(
    /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi,
    (_full, css: string) => {
      styles.push(css)
      return ''
    }
  )

  const bodyMatch = withoutStyles.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)
  const body = bodyMatch
    ? bodyMatch[1]
    : withoutStyles
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?(html|head|meta|title|link)\b[^>]*>/gi, '')

  return { css: styles.join('\n'), body: body.trim() }
}
