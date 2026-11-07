import { parseLessonContent } from '@/lib/chat/parse-lesson-content'
import { sanitizeLessonHtml } from '@/lib/sanitize/html'

interface LessonContentDisplayProps {
  contentHtml: string
  locale: string
}

export default function LessonContentDisplay({
  contentHtml,
  locale,
}: LessonContentDisplayProps) {
  const parsed = parseLessonContent(contentHtml)
  const isAr = locale === 'ar'
  const text =
    (isAr ? parsed.description_ar ?? parsed.description : parsed.description) ??
    parsed.description_ar ??
    parsed.description

  if (!text?.trim()) return null

  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(text)

  if (looksLikeHtml) {
    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none rounded-xl border bg-card p-6"
        dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(text) }}
      />
    )
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {text}
      </p>
    </div>
  )
}
