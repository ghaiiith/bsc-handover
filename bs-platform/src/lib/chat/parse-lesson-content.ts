export interface ParsedLessonContent {
  description?: string
  description_ar?: string
}

/** Parses lesson content_html — JSON descriptions or legacy HTML. */
export function parseLessonContent(contentHtml: string | null | undefined): ParsedLessonContent {
  if (!contentHtml?.trim()) return {}

  try {
    const parsed = JSON.parse(contentHtml) as {
      description?: string
      description_en?: string
      description_ar?: string
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        description: parsed.description ?? parsed.description_en,
        description_ar: parsed.description_ar,
      }
    }
  } catch {
    /* legacy HTML — treat as English description snippet */
    const text = contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text) return { description: text.slice(0, 500) }
  }

  return {}
}
