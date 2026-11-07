package queue

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"bs-platform-studio/internal/domain"

	"github.com/google/uuid"
)

type Manager struct {
	mu       sync.RWMutex
	jobs     []*domain.QueueJob
	path     string
	paused   bool
	onChange func()
}

func New(configDir string, onChange func()) *Manager {
	m := &Manager{
		path:     filepath.Join(configDir, "queue.json"),
		onChange: onChange,
	}
	_ = m.load()
	return m
}

func (m *Manager) load() error {
	raw, err := os.ReadFile(m.path)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, &m.jobs)
}

func (m *Manager) persist() {
	raw, _ := json.MarshalIndent(m.jobs, "", "  ")
	_ = os.MkdirAll(filepath.Dir(m.path), 0o755)
	_ = os.WriteFile(m.path, raw, 0o644)
}

func (m *Manager) notify() {
	if m.onChange != nil {
		m.onChange()
	}
}

func (m *Manager) Add(job *domain.QueueJob) {
	m.mu.Lock()
	job.ID = uuid.NewString()
	job.Status = domain.StatusWaiting
	job.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	job.UpdatedAt = job.CreatedAt
	m.jobs = append(m.jobs, job)
	m.reindexLocked()
	m.persist()
	m.mu.Unlock()
	m.notify()
}

func (m *Manager) List() []domain.QueueJob {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]domain.QueueJob, len(m.jobs))
	for i, j := range m.jobs {
		out[i] = *j
	}
	return out
}

func (m *Manager) Get(id string) *domain.QueueJob {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, j := range m.jobs {
		if j.ID == id {
			copy := *j
			return &copy
		}
	}
	return nil
}

func (m *Manager) Update(id string, fn func(*domain.QueueJob)) {
	m.mu.Lock()
	for _, j := range m.jobs {
		if j.ID == id {
			fn(j)
			j.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			break
		}
	}
	m.persist()
	m.mu.Unlock()
	m.notify()
}

func (m *Manager) NextRunnable() *domain.QueueJob {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.paused {
		return nil
	}
	for _, j := range m.jobs {
		if j.Status == domain.StatusWaiting {
			copy := *j
			return &copy
		}
	}
	return nil
}

func (m *Manager) Pause() {
	m.mu.Lock()
	m.paused = true
	m.mu.Unlock()
	m.notify()
}

func (m *Manager) Resume() {
	m.mu.Lock()
	m.paused = false
	m.mu.Unlock()
	m.notify()
}

func (m *Manager) IsPaused() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.paused
}

func (m *Manager) Cancel(id string) {
	m.Update(id, func(j *domain.QueueJob) {
		if j.Status != domain.StatusCompleted {
			j.Status = domain.StatusCancelled
			j.Message = "Cancelled by user"
		}
	})
}

func (m *Manager) Retry(id string) {
	m.Update(id, func(j *domain.QueueJob) {
		if j.Status == domain.StatusFailed || j.Status == domain.StatusCancelled {
			j.Status = domain.StatusWaiting
			j.Error = ""
			j.Progress = 0
			j.Message = "Queued for retry"
		}
	})
}

func (m *Manager) Reorder(ids []string) {
	m.mu.Lock()
	index := make(map[string]*domain.QueueJob, len(m.jobs))
	for _, j := range m.jobs {
		index[j.ID] = j
	}
	reordered := make([]*domain.QueueJob, 0, len(ids))
	for _, id := range ids {
		if j, ok := index[id]; ok {
			reordered = append(reordered, j)
			delete(index, id)
		}
	}
	rest := make([]*domain.QueueJob, 0, len(index))
	for _, j := range m.jobs {
		if _, ok := index[j.ID]; ok {
			rest = append(rest, j)
		}
	}
	sort.Slice(rest, func(i, j int) bool {
		return rest[i].CreatedAt < rest[j].CreatedAt
	})
	m.jobs = append(reordered, rest...)
	m.reindexLocked()
	m.persist()
	m.mu.Unlock()
	m.notify()
}

func (m *Manager) reindexLocked() {
	for i, j := range m.jobs {
		j.Position = i + 1
	}
}

func (m *Manager) CountByStatus(status domain.JobStatus) int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	n := 0
	for _, j := range m.jobs {
		if j.Status == status {
			n++
		}
	}
	return n
}

func (m *Manager) ActiveCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	n := 0
	for _, j := range m.jobs {
		switch j.Status {
		case domain.StatusAnalyzing, domain.StatusProcessing, domain.StatusGeneratingHLS,
			domain.StatusGeneratingThumbs, domain.StatusUploading, domain.StatusPublishing:
			n++
		}
	}
	return n
}
