// Platform commission removed — use per-instructor revenue agreements (src/lib/revenue/)
export const IRAQI_CITIES = [
  'بغداد', 'البصرة', 'الموصل', 'أربيل', 'السليمانية',
  'كركوك', 'النجف', 'كربلاء', 'الناصرية', 'العمارة',
  'الديوانية', 'الحلة', 'الرمادي', 'الفلوجة', 'تكريت', 'دهوك',
]

export const IRAQI_CITIES_EN = [
  'Baghdad', 'Basra', 'Mosul', 'Erbil', 'Sulaymaniyah',
  'Kirkuk', 'Najaf', 'Karbala', 'Nasiriyah', 'Amarah',
  'Diwaniyah', 'Hillah', 'Ramadi', 'Fallujah', 'Tikrit', 'Dohuk',
]

export interface CategoryOption {
  value: string
  /** Arabic label */
  label: string
  /** English label */
  labelEn: string
}

export const COURSE_CATEGORIES: CategoryOption[] = [
  { value: 'programming', label: 'البرمجة', labelEn: 'Programming' },
  { value: 'design', label: 'التصميم', labelEn: 'Design' },
  { value: 'marketing', label: 'التسويق', labelEn: 'Marketing' },
  { value: 'business', label: 'الأعمال', labelEn: 'Business' },
  { value: 'language', label: 'اللغات', labelEn: 'Languages' },
  { value: 'video', label: 'الفيديو والصوت', labelEn: 'Video & Audio' },
  { value: 'data', label: 'البيانات والذكاء الاصطناعي', labelEn: 'Data & AI' },
  { value: 'other', label: 'أخرى', labelEn: 'Other' },
]

export const SERVICE_CATEGORIES = [
  { value: 'programming', label: 'برمجة وتطوير', labelEn: 'Programming & Dev' },
  { value: 'design', label: 'تصميم جرافيك', labelEn: 'Graphic Design' },
  { value: 'video', label: 'مونتاج فيديو', labelEn: 'Video Editing' },
  { value: 'translation', label: 'ترجمة', labelEn: 'Translation' },
  { value: 'marketing', label: 'تسويق رقمي', labelEn: 'Digital Marketing' },
  { value: 'content', label: 'كتابة محتوى', labelEn: 'Content Writing' },
  { value: 'social', label: 'سوشيال ميديا', labelEn: 'Social Media' },
  { value: 'other', label: 'أخرى', labelEn: 'Other' },
]

export const MAX_FILE_SIZE_MB = 500
/** Max course video size (R2 multipart upload). */
export const MAX_VIDEO_SIZE_MB = 5120
/** Multipart chunk size for direct-to-R2 uploads. Must be >= 5MB (S3 rule). */
export const VIDEO_UPLOAD_PART_SIZE_MB = 16
export const MAX_DOCUMENT_SIZE_MB = 25
export const MAX_THUMBNAIL_SIZE_MB = 5
export const MAX_CV_SIZE_MB = 10
export const MAX_PORTFOLIO_IMAGES = 5
