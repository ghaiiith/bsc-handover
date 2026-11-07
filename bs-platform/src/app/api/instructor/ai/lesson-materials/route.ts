import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateLessonContent,
  generateLessonSlides,
  isTrainerStudioConfigured,
  renderDeckToPptx,
  type LessonContext,
} from '@/lib/instructor/ai/trainer-studio-server'
import { markdownToHtml } from '@/lib/html/markdown-to-html'
import { sanitizeRichText } from '@/lib/html/sanitize-html'
import { checkProAccess } from '@/lib/subscription/pro-access'

/**
 * Report BS-30: the AI tool's two discarded outputs, captured.
 *  - the written draft lands in the lesson's trainer notes box (report BS-31)
 *  - the slide deck is rendered to a real .pptx and stored as a lesson asset
 *
 * Both are drafts: the trainer edits the text and can replace the deck.
 */

const bodySchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  language: z.enum(['ar', 'en']).optional(),
  /** Skip a part when the trainer only wants the other one. */
  want: z.array(z.enum(['notes', 'slides'])).min(1).optional(),
})

/** Instructor (owner) or admin. Returns the caller's id, or null. */
async function authorizeCourseEditor(courseId: string): Promise<string | null> {
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

  if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) return null

  const admin = createAdminClient()
  const { data: course } = await admin
    .from('courses')
    .select('id, instructor_id')
    .eq('id', courseId)
    .maybeSingle()

  if (!course) return null
  if (course.instructor_id !== user.id && profile.role !== 'admin') return null

  return user.id
}

function draftToHtml(content: {
  body_markdown?: string
  video_script?: string
  key_takeaways?: string[]
  exercise?: string
}): string {
  const parts: string[] = []
  if (content.body_markdown?.trim()) parts.push(markdownToHtml(content.body_markdown))
  if (content.video_script?.trim()) {
    parts.push('<h3>Script</h3>', markdownToHtml(content.video_script))
  }
  if (content.key_takeaways?.length) {
    parts.push(
      '<h3>Key takeaways</h3>',
      markdownToHtml(content.key_takeaways.map((k) => `- ${k}`).join('\n'))
    )
  }
  if (content.exercise?.trim()) {
    parts.push('<h3>Exercise</h3>', markdownToHtml(content.exercise))
  }
  return sanitizeRichText(parts.join('\n'))
}

export async function POST(request: Request) {
  if (!isTrainerStudioConfigured()) {
    return NextResponse.json({ error: 'trainer_studio_not_configured' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const { courseId, lessonId } = parsed.data
  const userId = await authorizeCourseEditor(courseId)
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Report BS-49: AI course creation may be gated behind Pro (admin-configurable).
  const proAccess = await checkProAccess(userId, 'ai_course')
  if (!proAccess.allowed) {
    return NextResponse.json({ error: 'pro_required', feature: proAccess.feature }, { status: 402 })
  }

  const admin = createAdminClient()
  const { data: lesson } = await admin
    .from('lessons')
    .select('id, course_id, section_id, title, title_ar, duration_minutes, content_html')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!lesson) {
    return NextResponse.json({ error: 'lesson_not_found' }, { status: 404 })
  }

  const [{ data: course }, { data: section }] = await Promise.all([
    admin
      .from('courses')
      .select('title, title_ar, level, target_audience')
      .eq('id', courseId)
      .maybeSingle(),
    lesson.section_id
      ? admin
          .from('course_sections')
          .select('title, title_ar')
          .eq('id', lesson.section_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const language = parsed.data.language ?? 'ar'
  const isAr = language === 'ar'
  const ctx: LessonContext = {
    lesson: {
      title: (isAr ? lesson.title_ar || lesson.title : lesson.title) as string,
      summary: lessonSummary(lesson.content_html, isAr),
      duration_min: lesson.duration_minutes ?? undefined,
    },
    course_title: (isAr ? course?.title_ar || course?.title : course?.title) ?? undefined,
    module_title: (isAr ? section?.title_ar || section?.title : section?.title) ?? undefined,
    audience: course?.target_audience ?? undefined,
    level: course?.level ?? undefined,
    language,
  }

  const want = parsed.data.want ?? ['notes', 'slides']
  const [contentResult, deckResult] = await Promise.all([
    want.includes('notes') ? generateLessonContent(ctx) : Promise.resolve(null),
    want.includes('slides') ? generateLessonSlides(ctx) : Promise.resolve(null),
  ])

  const updates: Record<string, unknown> = {}
  const response: {
    notesHtml?: string
    slidesUrl?: string
    slidesName?: string
    errors: string[]
  } = { errors: [] }

  if (contentResult) {
    if (contentResult.ok) {
      const html = draftToHtml(contentResult.content)
      if (html) {
        updates.trainer_notes_html = html
        response.notesHtml = html
      }
    } else {
      response.errors.push(`notes:${contentResult.message}`)
    }
  }

  if (deckResult) {
    if (deckResult.ok) {
      const rendered = await renderDeckToPptx(deckResult.deck)
      if (rendered.ok) {
        const safeName = `${(lesson.title || 'lesson').replace(/[^\w\-]+/g, '-').slice(0, 40)}.pptx`
        const path = `${userId}/${courseId}/slides/${lessonId}-${Date.now()}.pptx`
        const { error: uploadError } = await admin.storage
          .from('course-documents')
          .upload(path, rendered.bytes, {
            contentType:
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            upsert: true,
          })

        if (uploadError) {
          response.errors.push(`slides:upload_failed`)
        } else {
          const { data: pub } = admin.storage.from('course-documents').getPublicUrl(path)
          updates.slides_url = pub.publicUrl
          updates.slides_name = safeName
          response.slidesUrl = pub.publicUrl
          response.slidesName = safeName
        }
      } else {
        response.errors.push(`slides:${rendered.message}`)
      }
    } else {
      response.errors.push(`slides:${deckResult.message}`)
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'generation_failed', errors: response.errors },
      { status: 502 }
    )
  }

  const { error: updateError } = await admin
    .from('lessons')
    .update(updates)
    .eq('id', lessonId)
    .eq('course_id', courseId)

  if (updateError) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json(response)
}

/** The lesson description is stored as bilingual JSON inside content_html. */
function lessonSummary(contentHtml: string | null, isAr: boolean): string | undefined {
  if (!contentHtml) return undefined
  try {
    const parsed = JSON.parse(contentHtml) as {
      description_ar?: string
      description_en?: string
    }
    const summary = isAr
      ? parsed.description_ar || parsed.description_en
      : parsed.description_en || parsed.description_ar
    return summary?.trim() || undefined
  } catch {
    return contentHtml.replace(/<[^>]*>/g, ' ').trim().slice(0, 500) || undefined
  }
}
