import type {
  ExperienceItem,
  EducationItem,
  ProjectItem,
  ProfileLinks,
} from '@/types/profile'

export type UserRole = 'student' | 'instructor' | 'admin' | 'company' | 'freelancer'
export type CourseStatus = 'draft' | 'pending' | 'published' | 'rejected'
export type CourseVisibility = 'draft' | 'private' | 'published' | 'archived'
export type CourseAccessType = 'lifetime' | 'subscription'
export type LessonType =
  | 'video'
  | 'pdf'
  | 'article'
  | 'download'
  | 'external'
  | 'live'
  | 'quiz'
  | 'assignment'
export type ResourceCategory =
  | 'documents'
  | 'source_code'
  | 'design_assets'
  | 'templates'
  | 'datasets'
export type ResourceAddedSource = 'studio' | 'lesson_editor'
export type ResourceUrlAccessMode = 'download' | 'visit'

export interface CourseResource {
  id: string
  course_id: string
  lesson_id: string | null
  title: string
  title_ar?: string | null
  file_url: string
  file_type: string
  category: ResourceCategory
  folder: string
  file_size_bytes?: number
  url_access_mode?: ResourceUrlAccessMode
  added_source: ResourceAddedSource
  added_by?: string | null
  created_at: string
}
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'
export type JobType = 'full_time' | 'part_time' | 'remote' | 'hybrid' | 'internship'
export type PaymentMethod = 'zaincash' | 'qicard' | 'wayl' | 'virtual'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type OrderStatus = 'pending' | 'in_progress' | 'delivered' | 'completed' | 'cancelled'
export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected'
export type InstructorRequestStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  email: string
  full_name: string
  full_name_ar?: string
  avatar_url?: string
  role: UserRole
  bio?: string
  bio_ar?: string
  phone?: string
  is_active: boolean
  is_verified?: boolean
  created_at: string
  headline?: string
  skills?: string[]
  experience?: ExperienceItem[]
  education?: EducationItem[]
  projects?: ProjectItem[]
  links?: ProfileLinks
  preferred_role?: string
  location?: string
  years_of_experience?: number | null
  availability?: boolean
  profile_completed_at?: string | null
  preferences?: Record<string, unknown>
  portfolio_slug?: string | null
  portfolio_is_public?: boolean
  uploaded_cv_url?: string | null
  uploaded_cv_name?: string | null
  account_type?: 'student' | 'instructor' | 'company' | 'freelancer' | null
  onboarding_completed?: boolean
  onboarding_completed_at?: string | null
  primary_goal?: string | null
  skill_level?: 'beginner' | 'intermediate' | 'advanced' | null
  interests?: string[]
  discovery_source?: string | null
  discovery_source_other?: string | null
  onboarding_version?: number
  onboarding_updated_at?: string | null
  instructor_intent?: string | null
  company_intent?: string | null
  freelancer_intent?: string | null
  onboarding_company_name?: string | null
  onboarding_company_industry?: string | null
  onboarding_company_size?: string | null
  onboarding_meta?: Record<string, unknown>
}

export interface Course {
  id: string
  instructor_id: string
  title: string
  title_ar: string
  description?: string
  description_ar?: string
  thumbnail_url?: string
  /** @deprecated legacy column, no longer written. Use preview_video_asset_id. */
  preview_video_url?: string
  preview_video_asset_id?: string | null
  price: number
  /** Report BS-78: admin per-course override of the platform commission %. */
  platform_commission_pct?: number | null
  category: string
  level: CourseLevel
  language: string
  status: CourseStatus
  slug: string
  /** Report BS-75: a published course's edits wait for admin approval. */
  pending_review_status?: 'none' | 'pending' | 'rejected'
  pending_rejection_reason?: string | null
  pending_submitted_at?: string | null
  rejection_reason?: string
  total_lessons: number
  total_duration_minutes: number
  created_at: string
  updated_at: string
  subtitle?: string
  subtitle_ar?: string
  subcategory?: string
  cover_image_url?: string
  meta_title?: string
  meta_description?: string
  seo_keywords?: string[]
  visibility?: CourseVisibility
  access_type?: CourseAccessType
  discount_price?: number | null
  learning_outcomes?: string[]
  target_audience?: string
  requirements?: string
  certificate_enabled?: boolean
  certificate_template?: string
  certificate_min_progress?: number
  final_exam_required?: boolean
  final_exam_pdf_path?: string | null
  final_exam_pdf_name?: string | null
  instructor?: User
  avg_rating?: number
  enrollment_count?: number
}

export interface CourseSection {
  id: string
  course_id: string
  title: string
  title_ar: string
  order_index: number
  lessons?: Lesson[]
}

export interface Lesson {
  id: string
  section_id: string
  course_id: string
  title: string
  title_ar: string
  slug: string
  /** @deprecated legacy column, no longer written. Use video_asset_id. */
  video_url?: string
  /** FK to the video_assets row holding this lesson's video. */
  video_asset_id?: string | null
  duration_minutes: number
  order_index: number
  is_free_preview: boolean
  lesson_type?: LessonType
  content_html?: string
  external_url?: string
  attachment_url?: string
  is_mandatory?: boolean
  /** Report BS-31: trainer-only notes. Never sent to students. */
  trainer_notes_html?: string | null
  /** Report BS-30: slide deck attached to this lesson. */
  slides_url?: string | null
  slides_name?: string | null
}

export type VideoAssetStatus = 'pending' | 'uploading' | 'ready' | 'failed'

export interface VideoAsset {
  id: string
  storage_provider: string
  bucket_name: string
  object_key: string
  mime_type?: string | null
  file_size?: number | null
  duration_seconds?: number | null
  status: VideoAssetStatus
  original_filename?: string | null
  course_id?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
  uploaded_at?: string | null
  /** Phase 4 — video provider layer */
  provider?: string
  provider_asset_id?: string | null
  provider_video_id?: string | null
  provider_upload_id?: string | null
  provider_status?: string | null
  provider_processing_status?: string | null
  provider_playback_url?: string | null
  provider_thumbnail_url?: string | null
  provider_duration?: number | null
  provider_resolution?: string | null
  provider_size?: number | null
  provider_metadata?: Record<string, unknown> | null
  provider_capabilities?: Record<string, unknown> | null
  provider_cost?: Record<string, unknown> | null
  provider_last_sync?: string | null
  provider_health?: string | null
  provider_error?: string | null
  provider_created_at?: string | null
  provider_updated_at?: string | null
  provider_version?: number
  provider_settings?: Record<string, unknown> | null
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  payment_id?: string
  enrolled_at: string
  course?: Course
  progress?: number
}

export interface LessonProgress {
  id: string
  student_id: string
  lesson_id: string
  completed: boolean
  completed_at?: string
}

export interface Payment {
  id: string
  user_id: string
  course_id?: string
  service_order_id?: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  reference_id?: string
  gateway_transaction_id?: string
  coupon_id?: string
  discount_snapshot?: Record<string, unknown>
  created_at: string
  /** Immutable financial snapshot (null = legacy pre-engine payment) */
  gross_amount?: number | null
  gateway_type?: 'local' | 'international' | null
  gateway_percentage?: number | null
  gateway_fixed_fee?: number | null
  gateway_total_fee?: number | null
  net_received_amount?: number | null
  platform_percentage?: number | null
  instructor_percentage?: number | null
  platform_revenue?: number | null
  instructor_revenue?: number | null
  agreement_id?: string | null
  exchange_rate?: number | null
  financial_snapshot_at?: string | null
  payout_status?: 'pending' | 'processing' | 'paid' | 'held'
}

export type DiscountParty = 'admin' | 'instructor'
export type CouponScope = 'platform' | 'course'

export interface CourseDiscount {
  id: string
  course_id: string
  created_by: string
  party: DiscountParty
  discount_percentage: number
  is_full_override: boolean
  starts_at: string
  ends_at: string
  label?: string
  label_ar?: string
  is_active: boolean
  created_at: string
  updated_at: string
  course?: Pick<Course, 'id' | 'title' | 'title_ar' | 'price'>
}

export interface Coupon {
  id: string
  code: string
  created_by: string
  party: DiscountParty
  scope: CouponScope
  course_id?: string
  discount_percentage: number
  max_uses?: number
  current_uses: number
  starts_at: string
  ends_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
  course?: Pick<Course, 'id' | 'title' | 'title_ar'>
}

export interface CouponRedemption {
  id: string
  coupon_id: string
  user_id: string
  course_id: string
  payment_id?: string
  discount_percentage_applied: number
  original_price: number
  final_price: number
  redeemed_at: string
  coupon?: Coupon
}

export interface PriceCalculation {
  original_price: number
  admin_discount_pct: number
  instructor_discount_pct: number
  coupon_discount_pct: number
  total_discount_pct: number
  final_price: number
  coupon_id?: string
  admin_discount_id?: string
  instructor_discount_id?: string
  savings: number
  coupon_valid?: boolean
  coupon_error?: string
}

export interface DiscountFormData {
  discount_percentage: number
  starts_at: string
  ends_at: string
  label?: string
  label_ar?: string
}

export interface CouponFormData {
  code: string
  scope: CouponScope
  course_id?: string
  discount_percentage: number
  max_uses?: number
  starts_at: string
  ends_at?: string
}

export interface Job {
  id: string
  admin_id?: string | null
  posted_by?: string | null
  title: string
  title_ar: string
  company_name: string
  city: string
  job_type: JobType
  salary_min?: number
  salary_max?: number
  currency: string
  skills: string[]
  description: string
  description_ar: string
  deadline?: string
  status: 'active' | 'closed' | 'draft' | 'expired'
  pending_review_status?: 'none' | 'pending' | 'rejected'
  pending_rejection_reason?: string | null
  pending_submitted_at?: string | null
  contact_email?: string
  contact_phone?: string
  contact_link?: string
  whatsapp_number?: string
  is_external?: boolean
  /** Round 9 (BS-111): Enterprise-only; validated server-side on write. */
  is_featured?: boolean
  /** Round 9: when the job last went live; drives the monthly publish cap. */
  published_at?: string | null
  created_at: string
  updated_at?: string
}

export interface JobApplication {
  id: string
  job_id: string
  applicant_id: string
  cv_url: string
  cover_letter?: string
  status: ApplicationStatus
  applied_at: string
  job?: Job
  applicant?: User
}

export interface ServicePortfolioItem {
  title?: string
  description?: string
  links?: string[]
  images?: string[]
}

export interface Service {
  id: string
  seller_id: string
  title: string
  title_ar: string
  description: string
  description_ar: string
  price: number
  delivery_days: number
  category: string
  status: 'active' | 'paused' | 'deleted' | 'pending' | 'rejected'
  rejection_reason?: string | null
  portfolio_images?: string[]
  portfolio_items?: ServicePortfolioItem[]
  contact_email?: string | null
  contact_phone?: string | null
  contact_link?: string | null
  whatsapp_number?: string | null
  admin_id?: string | null
  created_at: string
  updated_at?: string
  seller?: User
  avg_rating?: number
}

export interface ServiceOrder {
  id: string
  service_id: string
  buyer_id: string
  seller_id: string
  payment_id?: string
  requirements?: string
  status: OrderStatus
  ordered_at: string
  service?: Service
  buyer?: User
}

export interface Review {
  id: string
  reviewer_id: string
  target_type: 'course' | 'service'
  target_id: string
  rating: number
  comment?: string
  created_at: string
  instructor_reply?: string
  instructor_reply_at?: string
  reviewer?: User
}

export interface InstructorRequest {
  id: string
  user_id: string
  status: InstructorRequestStatus
  reason?: string
  admin_note?: string
  created_at: string
  user?: User
}

export type CompanyAffiliationRequestStatus = InstructorRequestStatus

export interface CompanyAffiliationRequest {
  id: string
  user_id: string
  company_name: string
  company_name_ar?: string | null
  status: CompanyAffiliationRequestStatus
  reason?: string
  admin_note?: string
  created_at: string
  user?: User
}

export interface Notification {
  id: string
  user_id: string
  title: string
  title_ar: string
  body: string
  body_ar: string
  type: string
  is_read: boolean
  created_at: string
}

export type {
  CVProfile,
  CVExport,
  CVFormData,
  ResumeInput,
  CvLanguage,
  CVTemplate,
} from '@/types/cv'
