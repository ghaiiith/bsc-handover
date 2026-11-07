/**
 * Escape a value for safe inclusion in a CSV cell.
 *
 * Mitigates CSV/formula injection: spreadsheet apps (Excel, Google Sheets,
 * LibreOffice) execute a cell as a formula when it begins with `=`, `+`, `-`,
 * `@`, tab, or carriage return. Since fields like name/email are user-supplied,
 * a value such as `=HYPERLINK(...)` or `=cmd|...` could run on an admin's
 * machine when they open the export. We prefix such values with a single quote
 * to neutralize them, then quote the cell and double up embedded quotes per
 * RFC 4180.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  const guarded = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
  return `"${guarded.replace(/"/g, '""')}"`
}
