const MAX_SEARCH_LENGTH = 100

/**
 * Sanitize a free-text search term before interpolating it into a PostgREST
 * `.or(...)` / `.ilike(...)` filter string.
 *
 * PostgREST parses the `or()` argument as a comma-separated logic tree with
 * `()` grouping (e.g. `col.ilike.val,other.eq.x`). Passing raw user input into
 * that string lets an attacker inject extra conditions or reference other
 * columns by including commas, parentheses, or backslashes. The `%`/`_` LIKE
 * wildcards and `*` would also let a term match far more than intended.
 *
 * We replace all of those control characters with spaces, collapse whitespace,
 * and cap the length. The result is safe to embed inside an `ilike` pattern.
 * Returns an empty string when nothing usable remains (caller should then skip
 * the filter).
 */
export function sanitizeSearchTerm(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[\\,()*"%_:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
