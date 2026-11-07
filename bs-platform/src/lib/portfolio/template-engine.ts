/**
 * Report BS-35: the tiny template language used by uploaded portfolio templates.
 *
 * Supported syntax (deliberately minimal — no expressions, no function calls):
 *   {{ name }}                    value, HTML-escaped
 *   {{{ bio_html }}}              value inserted raw (only for values we build ourselves)
 *   {{#if skills}} … {{else}} … {{/if}}
 *   {{#each experience}} … {{ title }} … {{/each}}
 *
 * Inside `{{#each}}` the item's own fields win, the outer context is still
 * readable, and `{{ . }}` / `{{ this }}` renders a primitive item (e.g. a skill
 * string). `{{ @index }}` is the 1-based position.
 *
 * Everything a user controls is escaped, so a template can never turn profile
 * data into markup.
 */

export type TemplateValue = unknown
export type TemplateContext = Record<string, TemplateValue>

/** Values we generate ourselves and allow through unescaped, via `{{{ }}}`. */
const RAW_ALLOWED = new Set(['links_html'])

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function lookup(path: string, scopes: TemplateContext[]): TemplateValue {
  const key = path.trim()
  if (key === '.' || key === 'this') {
    return scopes[scopes.length - 1]?.['.']
  }

  const parts = key.split('.').filter(Boolean)
  for (let i = scopes.length - 1; i >= 0; i--) {
    let current: TemplateValue = scopes[i]
    let found = true
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part]
      } else {
        found = false
        break
      }
    }
    if (found) return current
  }
  return undefined
}

function stringify(value: TemplateValue): string {
  if (value === null || value === undefined || value === false) return ''
  if (Array.isArray(value)) return value.map(stringify).filter(Boolean).join(', ')
  if (typeof value === 'object') return ''
  return String(value)
}

function isTruthy(value: TemplateValue): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(value) && value !== '0'
}

type Token =
  | { t: 'text'; value: string }
  | { t: 'raw'; path: string }
  | { t: 'value'; path: string }
  | { t: 'open'; kind: 'if' | 'each'; path: string }
  | { t: 'else' }
  | { t: 'close'; kind: 'if' | 'each' }

/** Matches an opening block, a closing block, `{{else}}`, or a value tag. */
const TAG = /\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*(#if|#each|\/if|\/each|else)?\s*([\w.@]*)\s*\}\}/g

/**
 * Renders `template` against `context`. Unknown tags render as an empty string
 * rather than throwing — a broken template should degrade, not 500 the page.
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  // Pass 1: build a token list so blocks can be nested.
  const tokens: Token[] = []

  let lastIndex = 0
  TAG.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TAG.exec(template)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ t: 'text', value: template.slice(lastIndex, match.index) })
    }
    lastIndex = TAG.lastIndex

    const [, rawPath, keyword, path] = match
    if (rawPath !== undefined) {
      tokens.push({ t: 'raw', path: rawPath })
    } else if (keyword === '#if') {
      tokens.push({ t: 'open', kind: 'if', path })
    } else if (keyword === '#each') {
      tokens.push({ t: 'open', kind: 'each', path })
    } else if (keyword === '/if') {
      tokens.push({ t: 'close', kind: 'if' })
    } else if (keyword === '/each') {
      tokens.push({ t: 'close', kind: 'each' })
    } else if (keyword === 'else') {
      tokens.push({ t: 'else' })
    } else if (path) {
      tokens.push({ t: 'value', path })
    }
  }
  if (lastIndex < template.length) {
    tokens.push({ t: 'text', value: template.slice(lastIndex) })
  }

  // Pass 2: walk the tokens, collecting block bodies as source, then recurse.
  return renderTokens(tokens, 0, tokens.length, [context]).out
}

function renderTokens(
  tokens: Token[],
  start: number,
  end: number,
  scopes: TemplateContext[]
): { out: string; next: number } {
  let out = ''
  let i = start

  while (i < end) {
    const token = tokens[i]

    if (token.t === 'text') {
      out += token.value
      i++
      continue
    }

    if (token.t === 'value') {
      if (token.path === '@index') {
        out += stringify(lookup('@index', scopes))
      } else {
        out += escapeHtml(stringify(lookup(token.path, scopes)))
      }
      i++
      continue
    }

    if (token.t === 'raw') {
      out += RAW_ALLOWED.has(token.path)
        ? stringify(lookup(token.path, scopes))
        : escapeHtml(stringify(lookup(token.path, scopes)))
      i++
      continue
    }

    if (token.t === 'open') {
      // Find the matching close, tracking nesting depth.
      let depth = 0
      let elseAt = -1
      let closeAt = -1
      for (let j = i + 1; j < end; j++) {
        const inner = tokens[j]
        if (inner.t === 'open') depth++
        else if (inner.t === 'close') {
          if (depth === 0) {
            closeAt = j
            break
          }
          depth--
        } else if (inner.t === 'else' && depth === 0 && elseAt === -1) {
          elseAt = j
        }
      }
      if (closeAt === -1) {
        // Unbalanced template — drop the rest rather than looping forever.
        break
      }

      const bodyEnd = elseAt === -1 ? closeAt : elseAt
      const value = lookup(token.path, scopes)

      if (token.kind === 'if') {
        if (isTruthy(value)) {
          out += renderTokens(tokens, i + 1, bodyEnd, scopes).out
        } else if (elseAt !== -1) {
          out += renderTokens(tokens, elseAt + 1, closeAt, scopes).out
        }
      } else {
        const list = Array.isArray(value) ? value : []
        if (list.length === 0 && elseAt !== -1) {
          out += renderTokens(tokens, elseAt + 1, closeAt, scopes).out
        } else {
          list.forEach((item, index) => {
            const scope: TemplateContext =
              item && typeof item === 'object' && !Array.isArray(item)
                ? { ...(item as Record<string, unknown>) }
                : {}
            scope['.'] = item
            scope['@index'] = index + 1
            out += renderTokens(tokens, i + 1, bodyEnd, [...scopes, scope]).out
          })
        }
      }

      i = closeAt + 1
      continue
    }

    // Stray {{else}} / {{/if}} outside a block: ignore.
    i++
  }

  return { out, next: i }
}
