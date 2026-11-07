package processing

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"time"

	"bs-platform-studio/internal/domain"
	"bs-platform-studio/internal/ffmpeg"
	"bs-platform-studio/internal/logging"
	"bs-platform-studio/internal/queue"
	"bs-platform-studio/internal/settings"
	"bs-platform-studio/internal/upload"
)

type Processor struct {
	queue    *queue.Manager
	settings *settings.Store
	logger   *logging.Logger
	toolkit  *ffmpeg.Toolkit
	uploader *upload.Client
	token    string
	emit     func(event string, payload interface{})
}

func New(
	q *queue.Manager,
	settings *settings.Store,
	logger *logging.Logger,
	toolkit *ffmpeg.Toolkit,
	uploader *upload.Client,
	token string,
	emit func(string, interface{}),
) *Processor {
	return &Processor{
		queue:    q,
		settings: settings,
		logger:   logger,
		toolkit:  toolkit,
		uploader: uploader,
		token:    token,
		emit:     emit,
	}
}

func (p *Processor) SetToken(token string) { p.token = token }
func (p *Processor) SetUploader(u *upload.Client) { p.uploader = u }
func (p *Processor) SetToolkit(t *ffmpeg.Toolkit) { p.toolkit = t }

func (p *Processor) RunJob(ctx context.Context, jobID string) {
	job := p.queue.Get(jobID)
	if job == nil {
		return
	}

	start := time.Now()
	p.log("info", fmt.Sprintf("Started job for %s", job.LessonTitle), jobID)

	defer func() {
		if r := recover(); r != nil {
			p.fail(jobID, fmt.Sprintf("panic: %v", r))
		}
	}()

	cfg := p.settings.Get()
	workDir := filepath.Join(cfg.TempDir, jobID)
	if cfg.TempDir == "" {
		workDir = filepath.Join(os.TempDir(), "bs-studio", jobID)
	}
	_ = os.MkdirAll(workDir, 0o755)

	// Analyze
	p.setStatus(jobID, domain.StatusAnalyzing, 5, "Analyzing video…")
	probe, err := p.toolkit.Probe(job.SourcePath)
	if err != nil {
		p.fail(jobID, err.Error())
		return
	}
	p.queue.Update(jobID, func(j *domain.QueueJob) { j.Probe = probe })

	// Process / copy source
	p.setStatus(jobID, domain.StatusProcessing, 15, "Preparing source MP4…")
	sourceDir := filepath.Join(workDir, "source")
	sourceMP4 := filepath.Join(sourceDir, "video.mp4")
	if err := p.toolkit.CopySourceMP4(job.SourcePath, sourceMP4); err != nil {
		p.fail(jobID, err.Error())
		return
	}

	// HLS
	p.setStatus(jobID, domain.StatusGeneratingHLS, 35, "Generating adaptive HLS…")
	hlsResult, err := p.toolkit.GenerateHLS(sourceMP4, ffmpeg.HLSOptions{
		OutputDir:     workDir,
		SegmentLength: cfg.SegmentLength,
		Threads:       cfg.FFmpegThreads,
		SourceHeight:  probe.Height,
	})
	if err != nil {
		p.fail(jobID, err.Error())
		return
	}

	// Thumbnails
	p.setStatus(jobID, domain.StatusGeneratingThumbs, 55, "Generating thumbnails…")
	thumbResult, err := p.toolkit.GenerateThumbnails(sourceMP4, ffmpeg.ThumbnailOptions{
		OutputDir:       workDir,
		Interval:        cfg.ThumbnailInterval,
		DurationSeconds: probe.DurationSeconds,
	})
	if err != nil {
		p.fail(jobID, err.Error())
		return
	}

	// Metadata
	meta := domain.ProcessingMetadata{
		DurationSeconds: probe.DurationSeconds,
		FPS:             probe.FPS,
		Width:           probe.Width,
		Height:          probe.Height,
		AspectRatio:     probe.AspectRatio,
		VideoCodec:      probe.VideoCodec,
		AudioCodec:      probe.AudioCodec,
		Bitrate:         probe.Bitrate,
		SegmentCount:    hlsResult.SegmentCount,
		ProcessingMs:    time.Since(start).Milliseconds(),
		GeneratedAt:     time.Now().UTC().Format(time.RFC3339),
		Variants:        hlsResult.VariantNames,
		Encrypted:       hlsResult.Encrypted,
		EncryptionMethod: "aes-128",
		IvHex:           hlsResult.IvHex,
		EncryptionVersion: 1,
		ProcessingVersion: 1,
	}
	metaPath := filepath.Join(workDir, "metadata", "processing.json")
	_ = os.MkdirAll(filepath.Dir(metaPath), 0o755)
	metaRaw, _ := json.MarshalIndent(meta, "", "  ")
	_ = os.WriteFile(metaPath, metaRaw, 0o644)

	// Upload
	p.setStatus(jobID, domain.StatusUploading, 70, "Uploading assets…")
	p.uploader.AccessToken = p.token
	p.uploader.Concurrency = cfg.UploadConcurrency

	durationSec := int(math.Round(probe.DurationSeconds))
	sourceKey := upload.ObjectKey(job.CourseID, job.LessonID, "source/video.mp4")
	sourceAssetID, err := p.uploader.UploadFile(job.CourseID, sourceKey, sourceMP4, &durationSec)
	if err != nil {
		p.fail(jobID, err.Error())
		return
	}
	p.queue.Update(jobID, func(j *domain.QueueJob) { j.SourceAssetID = sourceAssetID })

	// Upload all generated files under workDir
	uploadRoot := workDir
	files, _ := upload.WalkFiles(uploadRoot)
	uploaded := 0
	for _, file := range files {
		select {
		case <-ctx.Done():
			p.fail(jobID, "cancelled")
			return
		default:
		}
		rel, err := filepath.Rel(workDir, file)
		if err != nil {
			continue
		}
		rel = filepath.ToSlash(rel)
		if rel == "source/video.mp4" {
			continue
		}
		if ffmpeg.ShouldSkipHLSUpload(rel) {
			continue
		}
		objectKey := upload.ObjectKey(job.CourseID, job.LessonID, rel)
		if _, err := p.uploader.UploadFile(job.CourseID, objectKey, file, nil); err != nil {
			p.fail(jobID, fmt.Sprintf("upload %s: %v", rel, err))
			return
		}
		uploaded++
		pct := 70 + int(float64(uploaded)/float64(len(files))*20)
		p.setStatus(jobID, domain.StatusUploading, pct, fmt.Sprintf("Uploaded %s", rel))
	}

	_ = thumbResult

	// Register encryption key server-side (never uploaded to R2)
	if hlsResult.Encrypted && len(hlsResult.EncryptionKey) == 16 {
		keyB64 := base64.StdEncoding.EncodeToString(hlsResult.EncryptionKey)
		if err := p.uploader.RegisterEncryptionKey(job.CourseID, job.LessonID, keyB64, hlsResult.IvHex); err != nil {
			p.fail(jobID, fmt.Sprintf("register encryption key: %v", err))
			return
		}
	}

	// Publish
	p.setStatus(jobID, domain.StatusPublishing, 95, "Publishing lesson…")
	durationMin := int(math.Max(1, math.Ceil(probe.DurationSeconds/60)))
	if err := p.uploader.Publish(job.CourseID, job.LessonID, sourceAssetID, durationMin); err != nil {
		p.fail(jobID, err.Error())
		return
	}

	if cfg.CleanupAfterUpload {
		_ = os.RemoveAll(workDir)
	}

	p.queue.Update(jobID, func(j *domain.QueueJob) {
		j.Status = domain.StatusCompleted
		j.Progress = 100
		j.Message = "Published successfully"
		j.SourceAssetID = sourceAssetID
	})
	p.log("info", fmt.Sprintf("Completed job for %s", job.LessonTitle), jobID)
	p.emit("job:completed", jobID)
}

func (p *Processor) setStatus(id string, status domain.JobStatus, progress int, message string) {
	p.queue.Update(id, func(j *domain.QueueJob) {
		j.Status = status
		j.Progress = progress
		j.Message = message
	})
	p.emit("job:updated", id)
}

func (p *Processor) fail(id, msg string) {
	p.queue.Update(id, func(j *domain.QueueJob) {
		j.Status = domain.StatusFailed
		j.Error = msg
		j.Message = msg
	})
	p.log("error", msg, id)
	p.emit("job:failed", id)
}

func (p *Processor) log(level, message, jobID string) {
	p.logger.Add(level, message, jobID)
}
