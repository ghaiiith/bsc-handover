import { describe, it, expect } from 'vitest'
import { renderArticleBody } from '@/lib/articles/render-body'

describe('renderArticleBody (BS-105)', () => {
  it('never emits raw HTML from the author', () => {
    const out = renderArticleBody('<script>alert(1)</script> hello')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })

  it('renders paragraphs, headings and lists', () => {
    const out = renderArticleBody('# Intro\n\nFirst para\nsame para\n\n- one\n- two\n\n1. a\n2. b')
    expect(out).toContain('<h2>Intro</h2>')
    expect(out).toContain('<p>First para same para</p>')
    expect(out).toContain('<ul><li>one</li><li>two</li></ul>')
    expect(out).toContain('<ol><li>a</li><li>b</li></ol>')
  })

  it('links only to http(s) or site-relative targets', () => {
    expect(renderArticleBody('[ok](https://x.test)')).toContain('href="https://x.test"')
    expect(renderArticleBody('[rel](/ar/courses)')).toContain('href="/ar/courses"')
    const bad = renderArticleBody('[bad](javascript:alert(1))')
    expect(bad).not.toContain('href=')
    expect(bad).toContain('bad')
  })

  it('handles bold, italic, code and blockquotes', () => {
    const out = renderArticleBody('**b** and *i* and `c`\n\n> quoted')
    expect(out).toContain('<strong>b</strong>')
    expect(out).toContain('<em>i</em>')
    expect(out).toContain('<code>c</code>')
    expect(out).toContain('<blockquote>quoted</blockquote>')
  })

  it('keeps Arabic text intact', () => {
    const out = renderArticleBody('## عنوان\n\nنص عربي **مهم**')
    expect(out).toContain('<h3>عنوان</h3>')
    expect(out).toContain('نص عربي <strong>مهم</strong>')
  })

  it('escapes quotes inside attributes-looking text', () => {
    const out = renderArticleBody('say "hi" <b>')
    expect(out).toContain('&quot;hi&quot;')
    expect(out).toContain('&lt;b&gt;')
  })
})
