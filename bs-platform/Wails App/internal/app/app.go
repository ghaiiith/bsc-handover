package app

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"bs-platform-studio/internal/auth"
	"bs-platform-studio/internal/domain"
	"bs-platform-studio/internal/ffmpeg"
	"bs-platform-studio/internal/logging"
	"bs-platform-studio/internal/processing"
	"bs-platform-studio/internal/queue"
	"bs-platform-studio/internal/settings"
	"bs-platform-studio/internal/supabase"
	"bs-platform-studio/internal/upload"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx      context.Context
	configDir string
	settings *settings.Store
	auth     *auth.Service
	logger   *logging.Logger
	queue    *queue.Manager
	processor *processing.Processor

	mu           sync.RWMutex
	session      *domain.SessionInfo
	accessToken  string
	toolkit      *ffmpeg.Toolkit
	workerCancel context.CancelFunc
	workerWG     sync.WaitGroup
}

func New() *App {
	configDir := defaultConfigDir()
	return &App{configDir: configDir}
}

func defaultConfigDir() string {
	base, err := os.UserConfigDir()
	if err != nil {
		return filepath.Join(".", "bs-studio-data")
	}
	return filepath.Join(base, "BS Platform Studio")
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.settings = settings.NewStore(a.configDir)
	a.auth = auth.New(a.configDir)
	a.logger = logging.New(a.configDir)
	a.logger.Load()

	cfg := a.settings.Get()
	if cfg.TempDir == "" {
		cfg.TempDir = filepath.Join(a.configDir, "temp")
		_ = a.settings.Set(cfg)
	}
	if cfg.OutputDir == "" {
		cfg.OutputDir = filepath.Join(a.configDir, "output")
		_ = a.settings.Set(cfg)
	}

	a.queue = queue.New(a.configDir, func() {
		runtime.EventsEmit(a.ctx, "queue:updated")
	})

	a.refreshToolkit()
	a.initUploader()
	a.processor = processing.New(a.queue, a.settings, a.logger, a.toolkit, a.initUploader(), a.accessToken, a.emitEvent)

	if cfg.RememberSession && cfg.SupabaseURL != "" && cfg.SupabaseAnonKey != "" {
		if session, token, err := a.auth.RestoreSession(); err == nil {
			a.mu.Lock()
			a.session = session
			a.accessToken = token
			a.mu.Unlock()
			a.processor.SetToken(token)
		}
	}

	a.startWorkers()
}

func (a *App) Shutdown(ctx context.Context) {
	if a.workerCancel != nil {
		a.workerCancel()
	}
	a.workerWG.Wait()
}

func (a *App) emitEvent(event string, payload interface{}) {
	runtime.EventsEmit(a.ctx, event, payload)
}

func (a *App) refreshToolkit() {
	cfg := a.settings.Get()
	detected := ffmpeg.DetectNearExecutable(cfg.FFmpegPath, cfg.FFprobePath)
	if detected.Found {
		tk, err := ffmpeg.NewToolkit(detected)
		if err == nil {
			a.toolkit = tk
		}
	}
}

func (a *App) initUploader() *upload.Client {
	cfg := a.settings.Get()
	return &upload.Client{
		BaseURL:     cfg.PlatformURL,
		AccessToken: a.accessToken,
		Concurrency: cfg.UploadConcurrency,
	}
}

func (a *App) supabaseClient() (*supabase.Client, error) {
	a.mu.RLock()
	token := a.accessToken
	a.mu.RUnlock()
	cfg := a.settings.Get()
	if token == "" || cfg.SupabaseURL == "" {
		return nil, ErrNotAuthenticated
	}
	return supabase.New(cfg.SupabaseURL, cfg.SupabaseAnonKey, token), nil
}

var ErrNotAuthenticated = &AuthError{Message: "not authenticated"}

type AuthError struct{ Message string }
func (e *AuthError) Error() string { return e.Message }

// ── Auth ────────────────────────────────────────────────────────────────────

func (a *App) LoginWithGoogle() (*domain.SessionInfo, error) {
	cfg := a.settings.Get()
	if cfg.SupabaseURL == "" || cfg.SupabaseAnonKey == "" {
		return nil, fmt.Errorf("configure Supabase URL and anon key in Settings first (see README)")
	}

	session, token, err := a.auth.LoginWithGoogle(
		cfg.SupabaseURL,
		cfg.SupabaseAnonKey,
		cfg.RememberSession,
		func(authURL string) error {
			runtime.BrowserOpenURL(a.ctx, authURL)
			return nil
		},
	)
	if err != nil {
		return nil, err
	}

	a.mu.Lock()
	a.session = session
	a.accessToken = token
	a.mu.Unlock()
	a.processor.SetToken(token)
	a.logger.Add("info", "Signed in with Google as "+session.Email, "")
	return session, nil
}

func (a *App) Login(email, password string) (*domain.SessionInfo, error) {
	cfg := a.settings.Get()
	session, token, err := a.auth.Login(cfg.SupabaseURL, cfg.SupabaseAnonKey, email, password, cfg.RememberSession)
	if err != nil {
		return nil, err
	}
	a.mu.Lock()
	a.session = session
	a.accessToken = token
	a.mu.Unlock()
	a.processor.SetToken(token)
	a.logger.Add("info", "Signed in as "+session.Email, "")
	return session, nil
}

func (a *App) Logout() error {
	_ = a.auth.Logout()
	a.mu.Lock()
	a.session = nil
	a.accessToken = ""
	a.mu.Unlock()
	return nil
}

func (a *App) GetSession() *domain.SessionInfo {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.session
}

// ── Settings ────────────────────────────────────────────────────────────────

func (a *App) GetSettings() domain.AppSettings {
	return a.settings.Get()
}

func (a *App) SaveSettings(s domain.AppSettings) error {
	if err := a.settings.Set(s); err != nil {
		return err
	}
	a.refreshToolkit()
	a.processor.SetToolkit(a.toolkit)
	return nil
}

func (a *App) DetectFFmpeg() domain.DetectResult {
	cfg := a.settings.Get()
	return ffmpeg.DetectNearExecutable(cfg.FFmpegPath, cfg.FFprobePath)
}

// ── Data ────────────────────────────────────────────────────────────────────

func (a *App) GetDashboardStats() (*domain.DashboardStats, error) {
	client, err := a.supabaseClient()
	if err != nil {
		return nil, err
	}
	stats, err := client.DashboardStats()
	if err != nil {
		return nil, err
	}
	stats.VideosProcessing = a.queue.ActiveCount()
	stats.QueueWaiting = a.queue.CountByStatus(domain.StatusWaiting)
	stats.QueueActive = a.queue.ActiveCount()
	return stats, nil
}

func (a *App) ListCourses() ([]domain.CourseRow, error) {
	client, err := a.supabaseClient()
	if err != nil {
		return nil, err
	}
	return client.ListCourses()
}

func (a *App) ListLessons(courseID string) ([]domain.LessonRow, error) {
	client, err := a.supabaseClient()
	if err != nil {
		return nil, err
	}
	return client.ListLessons(courseID)
}

func (a *App) GetActivity(limit int) []domain.ActivityEntry {
	return a.logger.List(limit)
}

func (a *App) ExportLogs(destPath string) error {
	return a.logger.Export(destPath)
}

// ── Queue ───────────────────────────────────────────────────────────────────

func (a *App) ListQueueJobs() []domain.QueueJob {
	return a.queue.List()
}

func (a *App) ImportVideos(req domain.ImportRequest) ([]domain.QueueJob, error) {
	if a.session == nil {
		return nil, ErrNotAuthenticated
	}
	var created []domain.QueueJob
	for _, path := range req.FilePaths {
		job := &domain.QueueJob{
			CourseID:    req.CourseID,
			CourseTitle: req.CourseTitle,
			LessonID:    req.LessonID,
			LessonTitle: req.LessonTitle,
			SourcePath:  path,
		}
		a.queue.Add(job)
		created = append(created, *a.queue.Get(job.ID))
		a.logger.Add("info", "Imported "+filepath.Base(path), job.ID)
	}
	return created, nil
}

func (a *App) PauseQueue() { a.queue.Pause() }
func (a *App) ResumeQueue() { a.queue.Resume() }
func (a *App) CancelJob(id string) { a.queue.Cancel(id) }
func (a *App) RetryJob(id string) { a.queue.Retry(id) }
func (a *App) ReorderQueue(ids []string) { a.queue.Reorder(ids) }

func (a *App) ProbeVideo(path string) (*domain.VideoProbe, error) {
	if a.toolkit == nil {
		return nil, &AuthError{Message: "ffmpeg not found"}
	}
	return a.toolkit.Probe(path)
}

// ── File dialogs ────────────────────────────────────────────────────────────

func (a *App) PickVideoFiles() ([]string, error) {
	return runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select video files",
		Filters: []runtime.FileFilter{
			{DisplayName: "Video", Pattern: "*.mp4;*.mov;*.mkv;*.avi"},
		},
	})
}

func (a *App) PickVideoFolder() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select folder with videos",
	})
}

func (a *App) SaveLogExport() (string, error) {
	return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Export activity log",
		DefaultFilename: "bs-studio-activity.json",
		Filters:         []runtime.FileFilter{{DisplayName: "JSON", Pattern: "*.json"}},
	})
}

// ── Workers ─────────────────────────────────────────────────────────────────

func (a *App) startWorkers() {
	ctx, cancel := context.WithCancel(context.Background())
	a.workerCancel = cancel

	a.workerWG.Add(1)
	go func() {
		defer a.workerWG.Done()
		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			if a.queue.IsPaused() || a.session == nil || a.toolkit == nil {
				runtime.EventsEmit(a.ctx, "queue:idle")
				select {
				case <-ctx.Done():
					return
				case <-timeAfter(1500):
				}
				continue
			}

			cfg := a.settings.Get()
			if a.queue.ActiveCount() >= cfg.MaxParallelJobs {
				select {
				case <-ctx.Done():
					return
				case <-timeAfter(1000):
				}
				continue
			}

			job := a.queue.NextRunnable()
			if job == nil {
				select {
				case <-ctx.Done():
					return
				case <-timeAfter(1200):
				}
				continue
			}

			a.queue.Update(job.ID, func(j *domain.QueueJob) {
				j.Status = domain.StatusAnalyzing
				j.Message = "Starting…"
			})

			a.processor.SetUploader(a.initUploader())
			jobCtx, jobCancel := context.WithCancel(ctx)
			done := make(chan struct{})
			go func(id string) {
				defer close(done)
				defer jobCancel()
				a.processor.RunJob(jobCtx, id)
			}(job.ID)

			select {
			case <-done:
			case <-ctx.Done():
				jobCancel()
				<-done
			}
		}
	}()
}

func timeAfter(ms int) <-chan time.Time {
	return time.NewTimer(time.Duration(ms) * time.Millisecond).C
}
