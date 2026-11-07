package logging

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"bs-platform-studio/internal/domain"
)

type Logger struct {
	mu       sync.RWMutex
	entries  []domain.ActivityEntry
	path     string
	maxItems int
}

func New(configDir string) *Logger {
	return &Logger{
		path:     filepath.Join(configDir, "activity.json"),
		maxItems: 500,
	}
}

func (l *Logger) Load() {
	l.mu.Lock()
	defer l.mu.Unlock()
	raw, err := os.ReadFile(l.path)
	if err != nil {
		return
	}
	_ = json.Unmarshal(raw, &l.entries)
}

func (l *Logger) persist() {
	raw, _ := json.MarshalIndent(l.entries, "", "  ")
	_ = os.MkdirAll(filepath.Dir(l.path), 0o755)
	_ = os.WriteFile(l.path, raw, 0o644)
}

func (l *Logger) Add(level, message, jobID string) domain.ActivityEntry {
	entry := domain.ActivityEntry{
		ID:        time.Now().UTC().Format("20060102150405.000"),
		Level:     level,
		Message:   message,
		JobID:     jobID,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	l.mu.Lock()
	l.entries = append([]domain.ActivityEntry{entry}, l.entries...)
	if len(l.entries) > l.maxItems {
		l.entries = l.entries[:l.maxItems]
	}
	l.persist()
	l.mu.Unlock()
	return entry
}

func (l *Logger) List(limit int) []domain.ActivityEntry {
	l.mu.RLock()
	defer l.mu.RUnlock()
	if limit <= 0 || limit > len(l.entries) {
		limit = len(l.entries)
	}
	out := make([]domain.ActivityEntry, limit)
	copy(out, l.entries[:limit])
	return out
}

func (l *Logger) Export(destPath string) error {
	l.mu.RLock()
	raw, err := json.MarshalIndent(l.entries, "", "  ")
	l.mu.RUnlock()
	if err != nil {
		return err
	}
	return os.WriteFile(destPath, raw, 0o644)
}
