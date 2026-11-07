import { NextResponse } from 'next/server'
import { resolveCourseResourceDownloadAccess } from '@/lib/courses/resource-download-access'
import { effectiveResourceUrlAccessMode } from '@/lib/courses/resource-url-access'
import { assertPublicHttpUrl, isSafeHttpUrl } from '@/lib/security/ssrf'
import { buildResourceDownloadFilename, parseSupabaseStorageUrl } from '@/lib/storage/resource-storage'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function attachmentHeaders(filename: string, contentType: string): HeadersInit {
  const encoded = encodeURIComponent(filename)
  return {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string; resourceId: string }> }
) {
  const { courseId, resourceId } = await context.params
  const access = await resolveCourseResourceDownloadAccess(courseId, resourceId)

  if (!access.resource) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!access.allowed) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { resource } = access
  const accessMode = effectiveResourceUrlAccessMode(
    resource.file_url,
    resource.url_access_mode as 'download' | 'visit' | null | undefined
  )
  const filename = buildResourceDownloadFilename(resource.title, resource.file_url)
  const storageRef = parseSupabaseStorageUrl(resource.file_url)

  if (accessMode === 'visit' && !storageRef) {
    if (!isSafeHttpUrl(resource.file_url)) {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
    }
    return NextResponse.redirect(resource.file_url, 302)
  }

  if (storageRef) {
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from(storageRef.bucket)
      .download(storageRef.path)

    if (error || !data) {
      console.error('[resource-download] storage download failed:', error?.message)
      return NextResponse.json({ error: 'unavailable' }, { status: 502 })
    }

    const buffer = await data.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: attachmentHeaders(filename, data.type || 'application/octet-stream'),
    })
  }

  // SSRF guard: this is an instructor-supplied URL fetched server-side. Block
  // internal/loopback/link-local/metadata targets (incl. DNS-resolved ones).
  if (!(await assertPublicHttpUrl(resource.file_url))) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(resource.file_url, { cache: 'no-store' })
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 })
  }

  const contentType =
    upstream.headers.get('content-type') || 'application/octet-stream'

  return new NextResponse(upstream.body, {
    status: 200,
    headers: attachmentHeaders(filename, contentType),
  })
}
