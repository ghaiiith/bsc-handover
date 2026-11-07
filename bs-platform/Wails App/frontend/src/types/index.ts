export type JobStatus =
  | 'waiting'
  | 'waiting_analyzing'
  | 'processing'
  | 'generating_hls'
  | 'generating_thumbnails'
  | 'uploading'
  | 'publishing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled'

export interface VideoProbe {
  width: number
  height: number
  resolution: string
  fps: number
  videoCodec: string
  audioCodec: string
  durationSeconds: number
  bitrate: number
  fileSize: number
  aspectRatio: string
  rotation: number
  containerFormat: string
}

export interface QueueJob {
  id: string
  courseId: string
  courseTitle: string
  lessonId: string
  lessonTitle: string
  sourcePath: string
  status: JobStatus
  progress: number
  message: string
  probe?: VideoProbe
  sourceAssetId?: string
  error?: string
  createdAt: string
  updatedAt: string
  position: number
}

export interface CourseRow {
  id: string
  title: string
  titleAr: string
  status: string
  totalLessons: number
  thumbnailUrl?: string
}

export interface LessonRow {
  id: string
  courseId: string
  sectionId: string
  title: string
  titleAr: string
  durationMinutes: number
  videoAssetId?: string | null
  assetStatus?: string
  orderIndex: number
}

export interface DashboardStats {
  totalCourses: number
  totalLessons: number
  videosReady: number
  videosProcessing: number
  queueWaiting: number
  queueActive: number
  storageUsedBytes: number
}

export interface ActivityEntry {
  id: string
  level: string
  message: string
  jobId?: string
  createdAt: string
}

export interface SessionInfo {
  userId: string
  email: string
  fullName: string
  expiresAt: number
}

export interface AppSettings {
  platformUrl: string
  supabaseUrl: string
  supabaseAnonKey: string
  ffmpegPath: string
  ffprobePath: string
  tempDir: string
  outputDir: string
  maxParallelJobs: number
  uploadConcurrency: number
  ffmpegThreads: number
  segmentLength: number
  thumbnailInterval: number
  cleanupAfterUpload: boolean
  rememberSession: boolean
}

export interface DetectResult {
  ffmpegPath: string
  ffprobePath: string
  found: boolean
}

export interface ImportRequest {
  courseId: string
  lessonId: string
  courseTitle: string
  lessonTitle: string
  filePaths: string[]
}
