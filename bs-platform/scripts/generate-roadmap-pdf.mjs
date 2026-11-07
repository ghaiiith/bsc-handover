/**
 * Generates docs/PROJECT_ROADMAP.pdf from docs/PROJECT_ROADMAP.md
 * Usage: node scripts/generate-roadmap-pdf.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const mdPath = resolve(root, 'docs/PROJECT_ROADMAP.md')
const pdfPath = resolve(root, 'docs/PROJECT_ROADMAP.pdf')

const BROWSER_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter((value) => Boolean(value))

function resolveBrowserExecutable() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

if (!existsSync(mdPath)) {
  console.error('Missing docs/PROJECT_ROADMAP.md')
  process.exit(1)
}

const { mdToPdf } = await import('md-to-pdf')
const browserExecutable = resolveBrowserExecutable()

if (!browserExecutable) {
  console.error(
    'No Chrome/Edge executable found. Set PUPPETEER_EXECUTABLE_PATH or install Chrome.'
  )
  process.exit(1)
}

const css = `
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
    max-width: 100%;
  }
  h1 { font-size: 22pt; color: #045F6B; border-bottom: 2px solid #E57D17; padding-bottom: 8px; }
  h2 { font-size: 16pt; color: #045F6B; margin-top: 24px; page-break-after: avoid; }
  h3 { font-size: 13pt; color: #333; page-break-after: avoid; }
  h4 { font-size: 11pt; color: #555; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f4f5; font-weight: 600; }
  code { background: #f4f4f4; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }
  pre { background: #f8f8f8; padding: 12px; border-radius: 4px; font-size: 8pt; overflow-x: auto; }
  blockquote { border-left: 4px solid #E57D17; margin: 12px 0; padding: 8px 16px; background: #fffaf5; }
  a { color: #045F6B; }
  hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
`

console.info('Generating PDF from PROJECT_ROADMAP.md...')

await mdToPdf(
  { path: mdPath },
  {
    dest: pdfPath,
    css,
    pdf_options: {
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    },
    launch_options: {
      executablePath: browserExecutable,
      args: ['--no-sandbox'],
    },
  }
)

console.info(`Written: ${pdfPath}`)
