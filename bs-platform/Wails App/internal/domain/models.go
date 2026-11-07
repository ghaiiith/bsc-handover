package domain

type JobStatus string

const (
	StatusWaiting             JobStatus = "waiting"
	StatusAnalyzing           JobStatus = "waiting_analyzing"
	StatusProcessing          JobStatus = "processing"
	StatusGeneratingHLS       JobStatus = "generating_hls"
	StatusGeneratingThumbs    JobStatus = "generating_thumbnails"
	StatusUploading           JobStatus = "uploading"
	StatusPublishing          JobStatus = "publishing"
	StatusCompleted           JobStatus = "completed"
	StatusFailed              JobStatus = "failed"
	StatusPaused              JobStatus = "paused"
	StatusCancelled           JobStatus = "cancelled"
)

type VideoProbe struct {
	Width           int     `json:"width"`
	Height          int     `json:"height"`
	Resolution      string  `json:"resolution"`
	FPS             float64 `json:"fps"`
	VideoCodec      string  `json:"videoCodec"`
	AudioCodec      string  `json:"audioCodec"`
	DurationSeconds float64 `json:"durationSeconds"`
	Bitrate         int64   `json:"bitrate"`
	FileSize        int64   `json:"fileSize"`
	AspectRatio     string  `json:"aspectRatio"`
	Rotation        int     `json:"rotation"`
	ContainerFormat string  `json:"containerFormat"`
}

type ProcessingMetadata struct {
	DurationSeconds float64 `json:"durationSeconds"`
	FPS             float64 `json:"fps"`
	Width           int     `json:"width"`
	Height          int     `json:"height"`
	AspectRatio     string  `json:"aspectRatio"`
	VideoCodec      string  `json:"videoCodec"`
	AudioCodec      string  `json:"audioCodec"`
	Bitrate         int64   `json:"bitrate"`
	SegmentCount    int     `json:"segmentCount"`
	ProcessingMs    int64   `json:"processingMs"`
	GeneratedAt     string  `json:"generatedAt"`
	Variants        []string `json:"variants"`
	Encrypted       bool    `json:"encrypted"`
	EncryptionMethod string `json:"encryptionMethod,omitempty"`
	IvHex           string  `json:"ivHex,omitempty"`
	EncryptionVersion int   `json:"encryptionVersion"`
	ProcessingVersion int   `json:"processingVersion"`
}

type QueueJob struct {
	ID              string            `json:"id"`
	CourseID        string            `json:"courseId"`
	CourseTitle     string            `json:"courseTitle"`
	LessonID        string            `json:"lessonId"`
	LessonTitle     string            `json:"lessonTitle"`
	SourcePath      string            `json:"sourcePath"`
	Status          JobStatus         `json:"status"`
	Progress        int               `json:"progress"`
	Message         string            `json:"message"`
	Probe           *VideoProbe       `json:"probe,omitempty"`
	SourceAssetID   string            `json:"sourceAssetId,omitempty"`
	Error           string            `json:"error,omitempty"`
	CreatedAt       string            `json:"createdAt"`
	UpdatedAt       string            `json:"updatedAt"`
	Position        int               `json:"position"`
}

type CourseRow struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	TitleAr      string `json:"titleAr"`
	Status       string `json:"status"`
	TotalLessons int    `json:"totalLessons"`
	ThumbnailURL string `json:"thumbnailUrl,omitempty"`
}

type LessonRow struct {
	ID             string  `json:"id"`
	CourseID       string  `json:"courseId"`
	SectionID      string  `json:"sectionId"`
	Title          string  `json:"title"`
	TitleAr        string  `json:"titleAr"`
	DurationMinutes int    `json:"durationMinutes"`
	VideoAssetID   *string `json:"videoAssetId,omitempty"`
	AssetStatus    string  `json:"assetStatus,omitempty"`
	OrderIndex     int     `json:"orderIndex"`
}

type DashboardStats struct {
	TotalCourses      int   `json:"totalCourses"`
	TotalLessons      int   `json:"totalLessons"`
	VideosReady       int   `json:"videosReady"`
	VideosProcessing  int   `json:"videosProcessing"`
	QueueWaiting      int   `json:"queueWaiting"`
	QueueActive       int   `json:"queueActive"`
	StorageUsedBytes  int64 `json:"storageUsedBytes"`
}

type ActivityEntry struct {
	ID        string    `json:"id"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	JobID     string    `json:"jobId,omitempty"`
	CreatedAt string    `json:"createdAt"`
}

type SessionInfo struct {
	UserID    string `json:"userId"`
	Email     string `json:"email"`
	FullName  string `json:"fullName"`
	ExpiresAt int64  `json:"expiresAt"`
}

type AppSettings struct {
	PlatformURL        string `json:"platformUrl"`
	SupabaseURL        string `json:"supabaseUrl"`
	SupabaseAnonKey    string `json:"supabaseAnonKey"`
	FFmpegPath         string `json:"ffmpegPath"`
	FFprobePath        string `json:"ffprobePath"`
	TempDir            string `json:"tempDir"`
	OutputDir          string `json:"outputDir"`
	MaxParallelJobs    int    `json:"maxParallelJobs"`
	UploadConcurrency  int    `json:"uploadConcurrency"`
	FFmpegThreads      int    `json:"ffmpegThreads"`
	SegmentLength      int    `json:"segmentLength"`
	ThumbnailInterval  int    `json:"thumbnailInterval"`
	CleanupAfterUpload bool   `json:"cleanupAfterUpload"`
	RememberSession    bool   `json:"rememberSession"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ImportRequest struct {
	CourseID    string   `json:"courseId"`
	LessonID    string   `json:"lessonId"`
	CourseTitle string   `json:"courseTitle"`
	LessonTitle string   `json:"lessonTitle"`
	FilePaths   []string `json:"filePaths"`
}

type DetectResult struct {
	FFmpegPath  string `json:"ffmpegPath"`
	FFprobePath string `json:"ffprobePath"`
	Found       bool   `json:"found"`
}
