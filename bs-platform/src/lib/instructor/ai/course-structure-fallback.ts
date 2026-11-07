import { COURSE_CATEGORIES } from '@/lib/constants'
import type { AiCourseStructure } from '@/types/course-ai'

const GENERIC_LESSONS = [
  { title_ar: 'مقدمة', title_en: 'Introduction', minutes: 10 },
  { title_ar: 'المفاهيم الأساسية', title_en: 'Core Concepts', minutes: 15 },
  { title_ar: 'تطبيق عملي', title_en: 'Practical Application', minutes: 20 },
]

export function buildFallbackCourseStructure(
  courseTitle: string,
  courseTitleEn: string,
  category: string,
  level: string
): AiCourseStructure {
  const cat = COURSE_CATEGORIES.find((c) => c.value === category)
  const catLabelAr = cat?.label ?? 'المجال'
  const catLabelEn = cat?.labelEn ?? 'the field'

  const sections = [
    {
      title_ar: `أساسيات ${catLabelAr}`,
      title_en: `${catLabelEn} Fundamentals`,
      lessons: GENERIC_LESSONS.map((l, i) => ({
        title_ar: l.title_ar,
        title_en: l.title_en,
        duration_estimate_minutes: l.minutes,
        description_ar: `درس يغطي ${l.title_ar} في سياق ${courseTitle}.`,
        description_en: `Lesson covering ${l.title_en} in the context of ${courseTitleEn}.`,
        is_free_preview: i === 0,
        quiz_questions: [],
      })),
    },
    {
      title_ar: 'المستوى المتوسط',
      title_en: 'Intermediate Topics',
      lessons: GENERIC_LESSONS.map((l) => ({
        title_ar: `${l.title_ar} — متقدم`,
        title_en: `${l.title_en} — Advanced`,
        duration_estimate_minutes: l.minutes + 5,
        description_ar: `تعمق في ${l.title_ar}.`,
        description_en: `Deep dive into ${l.title_en}.`,
        is_free_preview: false,
        quiz_questions: [],
      })),
    },
    {
      title_ar: 'المشروع النهائي',
      title_en: 'Final Project',
      lessons: [
        {
          title_ar: 'مشروع تطبيقي',
          title_en: 'Capstone Project',
          duration_estimate_minutes: 30,
          description_ar: 'طبّق ما تعلمته في مشروع عملي.',
          description_en: 'Apply what you learned in a practical project.',
          is_free_preview: false,
          quiz_questions: [],
        },
      ],
    },
  ]

  return {
    sections,
    learning_outcomes_ar: [
      `فهم أساسيات ${catLabelAr}`,
      `تطبيق المفاهيم على مشاريع ${level}`,
      'بناء مهارات عملية قابلة للتوظيف',
    ],
    learning_outcomes_en: [
      `Understand ${catLabelEn} fundamentals`,
      `Apply concepts to ${level}-level projects`,
      'Build practical, job-ready skills',
    ],
    description_ar: `كورس ${courseTitle} في مجال ${catLabelAr} للمستوى ${level}. يغطي المفاهيم الأساسية والتطبيق العملي.`,
    description_en: `${courseTitleEn} is a ${level}-level course in ${catLabelEn}, covering fundamentals and hands-on practice.`,
    thumbnail_prompt: `Professional online course thumbnail for "${courseTitleEn}", ${catLabelEn} theme, modern flat design, educational`,
    estimated_total_hours: 3,
  }
}
