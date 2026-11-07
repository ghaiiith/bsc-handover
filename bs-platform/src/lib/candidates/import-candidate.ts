import 'server-only'

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCvFile, parseCvText } from '@/lib/cv/cv-builder-server'
import type { ResumeInput } from '@/types/cv'

/**
 * Report BS-40: one file from the bulk folder import — parse it, store it, and
 * create or update the matching candidate record. Every path returns a result
 * for the per-file report the UI shows at the end.
 */

export type ImportOutcome = 'imported' | 'updated' | 'duplicate' | 'failed'

export interface ImportResult {
  fileName: string
  outcome: ImportOutcome
  /** Why it failed / what it matched, for the report. */
  reason?: string
  candidateId?: string
  name?: string
}

export const MAX_CV_IMPORT_BYTES = 10 * 1024 * 1024
const PARSABLE_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg'])

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

/** Pulls the flat candidate fields out of the parsed resume. */
function summarize(resume: ResumeInput): {
  full_name: string | null
  email: string | null
  phone: string | null
  headline: string | null
  location: string | null
  skills: string[]
  years_experience: number | null
} {
  const basics = resume.basics ?? {}
  const skills = (resume.skills ?? [])
    .flatMap((s) => {
      const group = s as { name?: string; keywords?: string[]; items?: string[] }
      return [group.name, ...(group.keywords ?? []), ...(group.items ?? [])]
    })
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)

  const work = resume.work ?? []
  const years = work.length > 0 ? Math.min(40, work.length * 2) : null

  return {
    full_name: basics.name?.trim() || null,
    email: basics.email?.trim().toLowerCase() || null,
    phone: basics.phone?.trim() || null,
    headline: basics.label?.trim() || null,
    location: basics.location?.city?.trim() || null,
    skills: Array.from(new Set(skills)).slice(0, 60),
    years_experience: years,
  }
}

export async function importCandidateFile(
  file: File,
  importedBy: string
): Promise<ImportResult> {
  const fileName = file.name
  const ext = extensionOf(fileName)

  if (!PARSABLE_EXTENSIONS.has(ext)) {
    return { fileName, outcome: 'failed', reason: 'unsupported_type' }
  }
  if (file.size === 0) {
    return { fileName, outcome: 'failed', reason: 'empty_file' }
  }
  if (file.size > MAX_CV_IMPORT_BYTES) {
    return { fileName, outcome: 'failed', reason: 'file_too_large' }
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const fileHash = createHash('sha256').update(bytes).digest('hex')
  const admin = createAdminClient()

  // Byte-identical re-import: nothing to do.
  const { data: sameFile } = await admin
    .from('candidates')
    .select('id, full_name')
    .eq('file_hash', fileHash)
    .maybeSingle()

  if (sameFile) {
    return {
      fileName,
      outcome: 'duplicate',
      reason: 'same_file',
      candidateId: sameFile.id as string,
      name: (sameFile.full_name as string) ?? undefined,
    }
  }

  const parsed =
    ext === 'txt'
      ? await parseCvText(bytes.toString('utf8').slice(0, 20_000))
      : await parseCvFile(file)

  if (!parsed.ok) {
    return { fileName, outcome: 'failed', reason: parsed.message }
  }

  const summary = summarize(parsed.resume)
  if (!summary.full_name && !summary.email) {
    return { fileName, outcome: 'failed', reason: 'no_identity_found' }
  }

  // Keep the original file so the employer can open the real CV (report BS-39).
  const storagePath = `imports/${importedBy}/${fileHash}.${ext}`
  const { error: uploadError } = await admin.storage
    .from('cv-uploads')
    .upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })

  const cvUrl = uploadError
    ? null
    : admin.storage.from('cv-uploads').getPublicUrl(storagePath).data.publicUrl

  const record = {
    source: 'bulk_upload',
    ...summary,
    resume: parsed.resume as unknown as Record<string, unknown>,
    cv_url: cvUrl,
    cv_file_name: fileName,
    file_hash: fileHash,
    imported_by: importedBy,
    updated_at: new Date().toISOString(),
  }

  // Same person (by email), different file → refresh their record.
  if (summary.email) {
    const { data: existing } = await admin
      .from('candidates')
      .select('id')
      .eq('email', summary.email)
      .maybeSingle()

    if (existing) {
      const { error } = await admin
        .from('candidates')
        .update(record)
        .eq('id', existing.id as string)

      if (error) return { fileName, outcome: 'failed', reason: 'save_failed' }
      return {
        fileName,
        outcome: 'updated',
        reason: 'same_email',
        candidateId: existing.id as string,
        name: summary.full_name ?? undefined,
      }
    }
  }

  const { data: inserted, error } = await admin
    .from('candidates')
    .insert(record)
    .select('id')
    .single()

  if (error || !inserted) {
    return { fileName, outcome: 'failed', reason: 'save_failed' }
  }

  return {
    fileName,
    outcome: 'imported',
    candidateId: inserted.id as string,
    name: summary.full_name ?? undefined,
  }
}
