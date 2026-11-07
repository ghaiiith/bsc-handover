import 'server-only'

import sanitizeHtml from 'sanitize-html'

/**
 * Sanitize instructor-authored rich-text HTML before it is rendered with
 * dangerouslySetInnerHTML. Lesson descriptions are stored as HTML and shown to
 * every enrolled student, so unsanitized markup is a stored-XSS vector
 * (e.g. `<script>` or `<img onerror=...>`). We render through an allowlist that
 * permits common formatting but drops scripts, event handlers, and unsafe URIs.
 *
 * Uses sanitize-html (htmlparser2-based, no jsdom) so it bundles cleanly in the
 * Next.js server runtime.
 */
export function sanitizeLessonHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      'p', 'br', 'hr', 'span', 'div',
      'b', 'strong', 'i', 'em', 'u', 's', 'mark', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Force safe external links.
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      }),
    },
  })
}
