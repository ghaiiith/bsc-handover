export interface InstructorOption {
  id: string
  full_name: string
  full_name_ar: string | null
  email?: string
}

export interface CourseInstructor {
  id: string
  full_name: string
  full_name_ar: string | null
}

export interface CourseListItem {
  id: string
  title: string
  title_ar: string
  subtitle?: string
  subtitle_ar?: string
  description?: string
  description_ar?: string
  slug: string
  category: string
  level: string
  language: string
  status: string
  visibility?: string
  price: number
  discount_price?: number | null
  thumbnail_url?: string
  cover_image_url?: string
  preview_video_asset_id?: string | null
  total_lessons: number
  total_duration_minutes: number
  meta_title?: string
  meta_description?: string
  seo_keywords?: string[]
  learning_outcomes?: string[]
  target_audience?: string
  requirements?: string
  instructor_id: string
  instructor: CourseInstructor
  enrollment_count: number
  created_at: string
  updated_at: string
}

export interface CourseListResponse {
  items: CourseListItem[]
  total: number
  page: number
  pageSize: number
  stats: {
    published: number
    pending: number
    draft: number
    rejected: number
    archived: number
  }
}

export interface CurriculumLesson {
  id: string
  section_id: string
  course_id: string
  title: string
  title_ar: string
  slug: string
  duration_minutes: number
  order_index: number
  is_free_preview: boolean
  is_mandatory?: boolean
  lesson_type?: string
  video_asset_id?: string | null
  content_html?: string | null
  attachment_url?: string | null
  processing_status?: string
  upload_status?: string
  publication_status?: 'draft' | 'published'
  is_locked?: boolean
  video_asset?: {
    id: string
    status: string
    file_size?: number | null
    duration_seconds?: number | null
    original_filename?: string | null
    uploaded_at?: string | null
  } | null
}

export interface CurriculumSection {
  id: string
  course_id: string
  title: string
  title_ar: string
  order_index: number
  lessons: CurriculumLesson[]
}

export interface CourseCurriculum {
  courseId: string
  sections: CurriculumSection[]
}

export interface SearchResult {
  type: 'course' | 'lesson' | 'section'
  id: string
  courseId: string
  title: string
  titleAr: string
  subtitle?: string
  status?: string
}

export interface PlatformActivityItem {
  id: string
  type: string
  message: string
  courseId?: string
  createdAt: string
}

export interface SystemStats {
  cpuPercent?: number
  diskTotalGb: number
  diskFreeGb: number
  diskUsedPct: number
  memoryUsedMb: number
}
