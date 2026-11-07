/**
 * Minimal Markdown → HTML converter for the AI lesson draft (report BS-30).
 * The TrainerStudio service returns `body_markdown`, and the trainer notes box
 * (report BS-31) stores HTML, so the draft is converted on the way in.
 *
 * Deliberately small: headings, bold/italic, inline code, links, bullet and
 * numbered lists, blockquotes and paragraphs. Anything else is escaped text.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>'
    )
}

export function markdownToHtml(markdown: string): string {
  const lines = (markdown ?? '').replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  let paragraph: string[] = []

  const closeParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`)
      list = null
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (!line.trim()) {
      closeParagraph()
      closeList()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      closeParagraph()
      closeList()
      const level = Math.min(6, Math.max(2, heading[1].length + 1))
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) {
      closeParagraph()
      if (list !== 'ul') {
        closeList()
        out.push('<ul>')
        list = 'ul'
      }
      out.push(`<li>${inline(bullet[1])}</li>`)
      continue
    }

    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (numbered) {
      closeParagraph()
      if (list !== 'ol') {
        closeList()
        out.push('<ol>')
        list = 'ol'
      }
      out.push(`<li>${inline(numbered[1])}</li>`)
      continue
    }

    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      closeParagraph()
      closeList()
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`)
      continue
    }

    closeList()
    paragraph.push(line.trim())
  }

  closeParagraph()
  closeList()
  return out.join('\n')
}
