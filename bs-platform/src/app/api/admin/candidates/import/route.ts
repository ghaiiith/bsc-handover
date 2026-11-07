import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importCandidateFile, type ImportResult } from '@/lib/candidates/import-candidate'
import { isCvBuilderConfigured } from '@/lib/cv/cv-builder-server'

/**
 * Report BS-40: bulk CV import. The client posts the folder's files a few at a
 * time so it can show progress and so one huge request cannot time out; the
 * response carries a per-file result which the UI accumulates into the report.
 */

/** Files accepted per request — the client batches the folder into chunks. */
const MAX_FILES_PER_REQUEST = 5

async function requireAdminId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user.id : null
}

export async function POST(request: Request) {
  const adminId = await requireAdminId()
  if (!adminId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!isCvBuilderConfigured()) {
    return NextResponse.json({ error: 'cv_builder_not_configured' }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json({ error: 'no_files' }, { status: 400 })
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: 'too_many_files' }, { status: 400 })
  }

  const results: ImportResult[] = []
  for (const file of files) {
    try {
      results.push(await importCandidateFile(file, adminId))
    } catch (err) {
      console.error('[candidates/import]', file.name, err)
      results.push({ fileName: file.name, outcome: 'failed', reason: 'unexpected_error' })
    }
  }

  return NextResponse.json({ results })
}
