package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"bs-platform-studio/internal/domain"
)

type Store struct {
	mu   sync.RWMutex
	path string
	data domain.AppSettings
}

func Default() domain.AppSettings {
	return domain.AppSettings{
		PlatformURL:       "http://localhost:3000",
		MaxParallelJobs:   1,
		UploadConcurrency: 4,
		FFmpegThreads:     0,
		SegmentLength:     6,
		ThumbnailInterval: 10,
		CleanupAfterUpload: true,
		RememberSession:   true,
	}
}

func NewStore(configDir string) *Store {
	path := filepath.Join(configDir, "settings.json")
	s := &Store{path: path, data: Default()}
	_ = s.Load()
	return s
}

func (s *Store) Path() string {
	return s.path
}

func (s *Store) Get() domain.AppSettings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data
}

func (s *Store) Set(settings domain.AppSettings) error {
	s.mu.Lock()
	s.data = settings
	s.mu.Unlock()
	return s.save()
}

func (s *Store) Update(fn func(*domain.AppSettings)) error {
	s.mu.Lock()
	fn(&s.data)
	s.mu.Unlock()
	return s.save()
}

func (s *Store) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	raw, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return json.Unmarshal(raw, &s.data)
}

func (s *Store) save() error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, raw, 0o600)
}
