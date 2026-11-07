import { COURSE_CATEGORIES } from '@/lib/constants'

export function buildCourseStructureInstruction(input: {
  courseTitle: string
  courseTitleEn: string
  description: string
  category: string
  level: string
  language: string
  targetAudience?: string
}): string {
  const cat = COURSE_CATEGORIES.find((c) => c.value === input.category)
  const categoryLabel = cat ? `${cat.label} / ${cat.labelEn}` : input.category

  return `You are an expert course designer. Generate a complete course structure.

Course title (Arabic): ${input.courseTitle}
Course title (English): ${input.courseTitleEn}
Description: ${input.description}
Category: ${categoryLabel}
Level: ${input.level}
Language: ${input.language}
Target audience: ${input.targetAudience?.trim() || 'General learners'}

Respond ONLY with valid JSON (no markdown, no explanation). Use this exact schema:
{
  "sections": [
    {
      "title_ar": "string",
      "title_en": "string",
      "lessons": [
        {
          "title_ar": "string",
          "title_en": "string",
          "duration_estimate_minutes": number,
          "description_ar": "string (2-3 sentences)",
          "description_en": "string (2-3 sentences)",
          "is_free_preview": boolean,
          "notes_ar": "string (3-5 sentences of trainer teaching notes in Arabic)",
          "notes_en": "string (3-5 sentences of trainer teaching notes in English)",
          "quiz_questions": [
            {
              "question_ar": "string",
              "question_en": "string",
              "options_ar": ["string","string","string","string"],
              "options_en": ["string","string","string","string"],
              "correct_option_index": number
            }
          ]
        }
      ]
    }
  ],
  "learning_outcomes_ar": ["4-6 specific measurable outcomes in Arabic"],
  "learning_outcomes_en": ["4-6 specific measurable outcomes in English"],
  "description_ar": "full course description 150-200 words Arabic",
  "description_en": "full course description 150-200 words English",
  "thumbnail_prompt": "English prompt for AI image generation describing ideal course thumbnail",
  "estimated_total_hours": number
}

Guidelines:
- 4-7 sections, 3-6 lessons each, 15-30 lessons total
- Duration 5-20 minutes per lesson
- Quiz: 3 questions per lesson (skip quizzes for first 2 sections if level is beginner)
- Notes: 3-5 concise sentences of trainer-facing teaching notes per lesson (talking points, examples, common mistakes)
- Free preview: only first lesson of first section (is_free_preview: true)
- Learning outcomes: specific and measurable ("Students will be able to...")`
}

export function buildImproveLessonInstruction(input: {
  lessonTitle: string
  lessonTitleEn: string
  currentDescription: string
  sectionTitle: string
  courseTitle: string
  level: string
}): string {
  return `Improve this lesson description for an online course. Return ONLY valid JSON:
{"description_ar": "improved Arabic description 2-4 sentences", "description_en": "improved English description 2-4 sentences"}

Course: ${input.courseTitle}
Section: ${input.sectionTitle}
Lesson (AR): ${input.lessonTitle}
Lesson (EN): ${input.lessonTitleEn}
Level: ${input.level}
Current description: ${input.currentDescription || 'None'}`
}

export function buildGenerateQuizInstruction(input: {
  lessonTitle: string
  lessonTitleEn: string
  lessonDescription: string
  courseLevel: string
}): string {
  return `Generate exactly 3 multiple-choice quiz questions for this lesson. Return ONLY valid JSON:
{"questions": [{"question_ar":"...","question_en":"...","options_ar":["a","b","c","d"],"options_en":["a","b","c","d"],"correct_option_index":0}]}

Lesson (AR): ${input.lessonTitle}
Lesson (EN): ${input.lessonTitleEn}
Level: ${input.courseLevel}
Description: ${input.lessonDescription}`
}

// Report BS-77: generate quizzes ONLY, from material the instructor provides —
// no videos, no course scaffolding. The content itself is passed separately as
// the body to work from.
export function buildQuizFromContentInstruction(input: {
  count: number
  level: string
  questionType?: 'multiple_choice' | 'true_false'
}): string {
  const shape =
    input.questionType === 'true_false'
      ? 'TRUE/FALSE questions. Each question must have EXACTLY 2 options: ["True","False"] in English and ["صح","خطأ"] in Arabic'
      : 'multiple-choice questions. Each question must have EXACTLY 4 options with exactly one correct answer'
  return `Generate exactly ${input.count} ${shape}, based ONLY on the content provided below. Course level: ${input.level}. Write every question and all options in BOTH Arabic and English. Return ONLY valid JSON (no markdown):
{"questions": [{"question_ar":"...","question_en":"...","options_ar":["a","b","c","d"],"options_en":["a","b","c","d"],"correct_option_index":0}]}
Base the questions strictly on the provided material — do not invent facts that are not in it.`
}

export function buildImproveDescriptionInstruction(input: {
  title: string
  titleEn: string
  currentDescription?: string
  category: string
  level: string
  learningOutcomes?: string[]
}): string {
  const outcomes = input.learningOutcomes?.length
    ? `Existing outcomes: ${input.learningOutcomes.join('; ')}`
    : ''

  return `Write or improve course descriptions for an online learning platform. Return ONLY valid JSON:
{
  "description_ar": "150-200 word Arabic course description",
  "description_en": "150-200 word English course description",
  "learning_outcomes_ar": ["4-6 measurable outcomes in Arabic"],
  "learning_outcomes_en": ["4-6 measurable outcomes in English"]
}

Title (AR): ${input.title}
Title (EN): ${input.titleEn}
Category: ${input.category}
Level: ${input.level}
${input.currentDescription ? `Current description: ${input.currentDescription}` : 'No current description — write from scratch.'}
${outcomes}`
}
