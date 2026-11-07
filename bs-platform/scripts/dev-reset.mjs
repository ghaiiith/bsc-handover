/**
 * Stops stale Next.js dev servers and clears the .next cache.
 * Fixes widespread 404s on /login, /courses, API routes after route changes.
 *
 * Usage: npm run dev:reset
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const ports = [3000, 3001, 3002]

function killPort(port) {
  if (process.platform === 'win32') {
    try {
      const out = execSync(
        `netstat -ano | findstr :${port} | findstr LISTENING`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      )
      const pids = new Set(
        out
          .split('\n')
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => Boolean(pid && /^\d+$/.test(pid)))
      )
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
          console.info(`Stopped process ${pid} on port ${port}`)
        } catch {
          /* already gone */
        }
      }
    } catch {
      /* nothing listening */
    }
    return
  }

  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, {
      stdio: 'ignore',
      shell: '/bin/sh',
    })
    console.info(`Stopped listener(s) on port ${port}`)
  } catch {
    /* nothing listening */
  }
}

function validateLocaleJson(relativePath) {
  const filePath = resolve(root, relativePath)
  if (!existsSync(filePath)) {
    console.warn(`Missing locale file: ${relativePath}`)
    return
  }
  try {
    JSON.parse(readFileSync(filePath, 'utf8'))
    console.info(`Validated ${relativePath}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid JSON in ${relativePath}: ${message}`)
  }
}

function removePath(targetPath, label) {
  if (!existsSync(targetPath)) return

  if (process.platform === 'win32') {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        execSync(
          `powershell -NoProfile -Command "Remove-Item -LiteralPath '${targetPath.replace(/'/g, "''")}' -Recurse -Force -ErrorAction Stop"`,
          { stdio: 'inherit' }
        )
        console.info(`Removed ${label}`)
        return
      } catch {
        if (attempt === 3) {
          throw new Error(`Failed to remove ${label} after 3 attempts`)
        }
        console.warn(`Retrying ${label} removal (${attempt}/3)...`)
        execSync('powershell -NoProfile -Command "Start-Sleep -Seconds 1"')
      }
    }
    return
  }

  rmSync(targetPath, { recursive: true, force: true })
  console.info(`Removed ${label}`)
}

for (const port of ports) {
  killPort(port)
}

validateLocaleJson('src/locales/en.json')
validateLocaleJson('src/locales/ar.json')

removePath(resolve(root, '.next'), '.next cache')
removePath(resolve(root, 'node_modules/.cache'), 'node_modules/.cache')

console.info('Done. Start dev with: npm run dev')
