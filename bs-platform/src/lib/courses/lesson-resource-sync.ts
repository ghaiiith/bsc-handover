import type { SupabaseClient } from '@supabase/supabase-js'

export async function syncLessonAttachmentResource(
  supabase: SupabaseClient,
  params: {
    courseId: string
    lessonId: string
    userId: string
    attachmentUrl: string | null
    title: string
    titleAr: string
  }
) {
  const { courseId, lessonId, userId, attachmentUrl, title, titleAr } = params

  await supabase
    .from('course_resources')
    .delete()
    .eq('course_id', courseId)
    .eq('lesson_id', lessonId)
    .eq('added_source', 'lesson_editor')

  if (!attachmentUrl?.trim()) return

  await supabase.from('course_resources').insert({
    course_id: courseId,
    lesson_id: lessonId,
    title: title.trim() || 'Lesson attachment',
    title_ar: titleAr.trim() || null,
    file_url: attachmentUrl.trim(),
    file_type: 'document',
    category: 'documents',
    folder: 'lesson',
    added_source: 'lesson_editor',
    added_by: userId,
  })
}
