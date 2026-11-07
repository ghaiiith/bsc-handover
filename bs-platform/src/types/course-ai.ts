export interface AiQuizQuestion {
  question_ar: string
  question_en: string
  options_ar: string[]
  options_en: string[]
  correct_option_index: number
}

export interface AiGeneratedLesson {
  title_ar: string
  title_en: string
  duration_estimate_minutes: number
  description_ar: string
  description_en: string
  is_free_preview: boolean
  quiz_questions?: AiQuizQuestion[]
  // Report BS-60: brief trainer notes generated in the same call, saved to the
  // lesson's trainer-only notes. The manual per-lesson regenerate stays for depth.
  notes_ar?: string
  notes_en?: string
}

export interface AiGeneratedSection {
  title_ar: string
  title_en: string
  lessons: AiGeneratedLesson[]
}

export interface AiCourseStructure {
  sections: AiGeneratedSection[]
  learning_outcomes_ar: string[]
  learning_outcomes_en: string[]
  description_ar: string
  description_en: string
  thumbnail_prompt: string
  estimated_total_hours: number
}

export interface AiCourseStructureResponse extends AiCourseStructure {
  isFallback: boolean
}
