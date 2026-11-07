import { describe, it, expect } from 'vitest'
import { markdownToHtml } from '@/lib/html/markdown-to-html'
import { sanitizeRichText, stripUnsafeHtml } from '@/lib/html/sanitize-html'

describe('markdownToHtml', () => {
  it('converts headings, lists and emphasis', () => {
    const html = markdownToHtml('## Intro\n\n- one\n- two\n\n**bold** and *italic*')
    expect(html).toContain('<h3>Intro</h3>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('handles numbered lists, quotes and links', () => {
    expect(markdownToHtml('1. first\n2. second')).toContain('<ol>')
    expect(markdownToHtml('> note')).toContain('<blockquote>note</blockquote>')
    expect(markdownToHtml('[docs](https://example.com)')).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">docs</a>'
    )
  })

  it('escapes raw HTML in the markdown source', () => {
    expect(markdownToHtml('<script>alert(1)</script>')).not.toContain('<script>')
  })

  it('keeps Arabic text and joins wrapped lines into one paragraph', () => {
    expect(markdownToHtml('هذا الدرس\nيشرح الأساسيات')).toBe('<p>هذا الدرس يشرح الأساسيات</p>')
  })
})

describe('sanitizeRichText', () => {
  it('strips scripts and handlers but keeps formatting', () => {
    const clean = sanitizeRichText(
      '<p onclick="x()">hi <strong>there</strong></p><script>bad()</script>'
    )
    expect(clean).toBe('<p>hi <strong>there</strong></p>')
  })

  it('shares its implementation with the portfolio sanitizer', () => {
    expect(stripUnsafeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
  })
})
