export type JobSourceType = 'telegram' | 'linkedin' | 'rss'

export interface TelegramSourceConfig {
  channel_username: string
  channel_id?: string
}

export interface LinkedInSourceConfig {
  search_query: string
  location?: string
  job_type?: string
}

export interface RssSourceConfig {
  feed_url: string
}

export type JobSourceConfig =
  | TelegramSourceConfig
  | LinkedInSourceConfig
  | RssSourceConfig

export interface JobSource {
  id: string
  type: JobSourceType
  name: string
  config: JobSourceConfig
  is_active: boolean
  last_checked_at: string | null
  total_imported: number
  created_at: string
}

export type ImportedJobStatus =
  | 'pending'
  | 'processing'
  | 'reviewed'
  | 'published'
  | 'rejected'
  | 'duplicate'

export interface AiJobParseResult {
  is_job_posting: boolean
  confidence: number
  title: string | null
  title_ar: string | null
  company_name: string | null
  city: string | null
  job_type: 'full_time' | 'part_time' | 'remote' | 'internship' | null
  salary_min: number | null
  salary_max: number | null
  skills: string[]
  description: string | null
  description_ar: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_link: string | null
  whatsapp_number: string | null
  deadline: string | null
}

export interface ImportedJob {
  id: string
  source_id: string | null
  source_type: string
  raw_content: string
  source_url: string | null
  source_post_id: string | null
  ai_processed: boolean
  ai_result: AiJobParseResult | null
  status: ImportedJobStatus
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  published_job_id: string | null
}

export interface ScrapedJobItem {
  raw_content: string
  source_url?: string
  source_post_id?: string
}
