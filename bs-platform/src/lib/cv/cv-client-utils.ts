'use client'

import { CV_EXPORT_TIMEOUT_MS } from '@/lib/cv/constants'

export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function parseContentDispositionFileName(header: string | null): string | null {
  if (!header) return null

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const quotedMatch = header.match(/filename="([^"]+)"/i)
  if (quotedMatch?.[1]) return quotedMatch[1]

  const plainMatch = header.match(/filename=([^;]+)/i)
  if (plainMatch?.[1]) return plainMatch[1].trim()

  return null
}

async function downloadPdfFromSignedUrl(
  signedUrl: string,
  fileName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(signedUrl)
    if (!response.ok) return { ok: false, error: 'fetch_failed' }

    const blob = await response.blob()
    triggerBlobDownload(blob, fileName)
    return { ok: true }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function downloadCvPdf(
  profileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CV_EXPORT_TIMEOUT_MS)

  try {
    const res = await fetch('/api/cv/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId }),
      signal: controller.signal,
    })

    const contentType = res.headers.get('content-type') ?? ''

    if (res.ok && contentType.includes('application/pdf')) {
      const blob = await res.blob()
      const fileName =
        parseContentDispositionFileName(res.headers.get('content-disposition')) ??
        'CV.pdf'
      triggerBlobDownload(blob, fileName)
      return { ok: true }
    }

    const data = (await res.json()) as {
      signedUrl?: string
      pdfBase64?: string
      fileName?: string
      error?: string
    }

    if (!res.ok) {
      // Report BS-49: surface a Pro-upgrade signal instead of a generic failure.
      if (res.status === 402) return { ok: false, error: 'pro_required' }
      return { ok: false, error: data.error ?? 'export_failed' }
    }

    const fileName = data.fileName ?? 'CV.pdf'

    if (data.signedUrl) {
      return downloadPdfFromSignedUrl(data.signedUrl, fileName)
    }

    if (data.pdfBase64) {
      const binary = atob(data.pdfBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      triggerBlobDownload(new Blob([bytes], { type: 'application/pdf' }), fileName)
      return { ok: true }
    }

    return { ok: false, error: 'no_pdf' }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'timeout' }
    }
    return { ok: false, error: 'network' }
  } finally {
    clearTimeout(timeout)
  }
}

export async function downloadPortfolioCv(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/portfolio/download-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    const contentType = res.headers.get('content-type') ?? ''

    if (res.ok && contentType.includes('application/pdf')) {
      const blob = await res.blob()
      const fileName =
        parseContentDispositionFileName(res.headers.get('content-disposition')) ??
        'CV.pdf'
      triggerBlobDownload(blob, fileName)
      return { ok: true }
    }

    const data = (await res.json()) as { error?: string }
    return { ok: false, error: data.error ?? 'no_cv' }
  } catch {
    return { ok: false, error: 'network' }
  }
}
