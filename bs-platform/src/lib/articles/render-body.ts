/**
 * Round 9 (BS-105): turn an article body into safe HTML.
 *
 * Authors write Markdown-lite (paragraphs, headings, lists, links, bold,
 * italic, images). Everything is HTML-escaped FIRST, then a small set of
 * patterns re-introduce markup — so no raw HTML from the editor is ever
 * emitted, and a pasted <script> renders as literal text.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeUrl(u: string): string | null {
  const t = u.trim()
  if (/^https?:\/\//i.test(t) || t.startsWith('/')) return t
  return null
}

function inline(text: string): string {
  let out = escapeHtml(text)
  // images ![alt](url)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
    const u = safeUrl(url)
    return u ? `<img src="${u}" alt="${alt}" loading="lazy" />` : alt
  })
  // links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const u = safeUrl(url)
    return u ? `<a href="${u}" rel="noopener noreferrer"${/^https?:/.test(u) ? ' target="_blank"' : ''}>${label}</a>` : label
  })
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  return out
}

export function renderArticleBody(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let para: string[] = []
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(' '))}</p>`)
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      html.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`)
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushPara()
      flushList()
      continue
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      flushPara()
      flushList()
      const level = h[1].length + 1 // h1 is the page title; body starts at h2
      html.push(`<h${level}>${inline(h[2])}</h${level}>`)
      continue
    }
    const ul = /^[-*]\s+(.*)$/.exec(line)
    const ol = /^\d+[.)]\s+(.*)$/.exec(line)
    if (ul || ol) {
      flushPara()
      const type = ul ? 'ul' : 'ol'
      if (!list || list.type !== type) {
        flushList()
        list = { type, items: [] }
      }
      list.items.push((ul ?? ol)![1])
      continue
    }
    if (/^>\s?/.test(line)) {
      flushPara()
      flushList()
      html.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`)
      continue
    }
    flushList()
    para.push(line.trim())
  }
  flushPara()
  flushList()
  return html.join('\n')
}
