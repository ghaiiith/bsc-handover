package app

import (
	"encoding/json"
	"net/url"
	"runtime"

	"bs-platform-studio/internal/cms"
)

func (a *App) cmsClient() (*cms.Client, error) {
	a.mu.RLock()
	token := a.accessToken
	a.mu.RUnlock()
	if token == "" {
		return nil, ErrNotAuthenticated
	}
	cfg := a.settings.Get()
	return cms.New(cfg.PlatformURL, token), nil
}

// CMSListCourses returns paginated course list JSON from platform API.
func (a *App) CMSListCourses(queryJSON string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	params := url.Values{}
	if queryJSON != "" {
		var m map[string]string
		if json.Unmarshal([]byte(queryJSON), &m) == nil {
			for k, v := range m {
				if v != "" {
					params.Set(k, v)
				}
			}
		}
	}
	raw, err := client.ListCourses(params)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (a *App) CMSGetCourse(courseID string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.GetCourse(courseID)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (a *App) CMSCreateCourse(bodyJSON string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	var body map[string]string
	if err := json.Unmarshal([]byte(bodyJSON), &body); err != nil {
		return "", err
	}
	raw, err := client.CreateCourse(body)
	if err != nil {
		return "", err
	}
	a.logger.Add("info", "Created course", "")
	return string(raw), nil
}

func (a *App) CMSUpdateCourse(courseID, bodyJSON string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	var body map[string]any
	if err := json.Unmarshal([]byte(bodyJSON), &body); err != nil {
		return "", err
	}
	raw, err := client.UpdateCourse(courseID, body)
	if err != nil {
		return "", err
	}
	a.logger.Add("info", "Updated course "+courseID, "")
	return string(raw), nil
}

func (a *App) CMSDeleteCourse(courseID string) error {
	client, err := a.cmsClient()
	if err != nil {
		return err
	}
	if err := client.DeleteCourse(courseID); err != nil {
		return err
	}
	a.logger.Add("info", "Deleted course "+courseID, "")
	return nil
}

func (a *App) CMSCourseAction(courseID, action string) error {
	client, err := a.cmsClient()
	if err != nil {
		return err
	}
	if err := client.CourseAction(courseID, action); err != nil {
		return err
	}
	a.logger.Add("info", "Course "+action+": "+courseID, "")
	return nil
}

func (a *App) CMSDuplicateCourse(courseID string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.DuplicateCourse(courseID)
	if err != nil {
		return "", err
	}
	a.logger.Add("info", "Duplicated course "+courseID, "")
	return string(raw), nil
}

func (a *App) CMSBulkCourses(courseIDs []string, action string) error {
	client, err := a.cmsClient()
	if err != nil {
		return err
	}
	if err := client.BulkCourses(courseIDs, action); err != nil {
		return err
	}
	a.logger.Add("info", "Bulk "+action+" on courses", "")
	return nil
}

func (a *App) CMSGetCurriculum(courseID string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.GetCurriculum(courseID)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (a *App) CMSCreateSection(courseID, title, titleAr string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.CreateSection(courseID, title, titleAr)
	if err != nil {
		return "", err
	}
	a.logger.Add("info", "Created section in "+courseID, "")
	return string(raw), nil
}

func (a *App) CMSUpdateSection(courseID, sectionID, bodyJSON string) error {
	client, err := a.cmsClient()
	if err != nil {
		return err
	}
	var body map[string]string
	_ = json.Unmarshal([]byte(bodyJSON), &body)
	return client.UpdateSection(courseID, sectionID, body)
}

func (a *App) CMSDeleteSection(courseID, sectionID string) error {
	client, err := a.cmsClient()
	if err != nil {
		return err
	}
	if err := client.DeleteSection(courseID, sectionID); err != nil {
		return err
	}
	a.logger.Add("info", "Deleted section "+sectionID, "")
	return nil
}

func (a *App) CMSReorderSections(courseID string, sectionIDs []string) error {
	client, err := a.cmsClient()
	if err != nil {
		return err
	}
	return client.ReorderSections(courseID, sectionIDs)
}

func (a *App) CMSCreateLesson(courseID, bodyJSON string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	var body map[string]any
	if err := json.Unmarshal([]byte(bodyJSON), &body); err != nil {
		return "", err
	}
	raw, err := client.CreateLesson(courseID, body)
	if err != nil {
		return "", err
	}
	a.logger.Add("info", "Created lesson in "+courseID, "")
	return string(raw), nil
}

func (a *App) CMSGetLesson(courseID, lessonID string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.GetLesson(courseID, lessonID)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (a *App) CMSUpdateLesson(courseID, lessonID, bodyJSON string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	var body map[string]any
	if err := json.Unmarshal([]byte(bodyJSON), &body); err != nil {
		return "", err
	}
	raw, err := client.UpdateLesson(courseID, lessonID, body)
	if err != nil {
		return "", err
	}
	a.logger.Add("info", "Updated lesson "+lessonID, "")
	return string(raw), nil
}

func (a *App) CMSDeleteLesson(courseID, lessonID string) error {
	client, err := a.cmsClient()
	if err != nil {
		return err
	}
	if err := client.DeleteLesson(courseID, lessonID); err != nil {
		return err
	}
	a.logger.Add("info", "Deleted lesson "+lessonID, "")
	return nil
}

func (a *App) CMSDuplicateLesson(courseID, lessonID string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.DuplicateLesson(courseID, lessonID)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (a *App) CMSLessonAction(courseID, lessonID, action string, extraJSON string) error {
	client, err := a.cmsClient()
	if err != nil {
		return err
	}
	extra := map[string]any{}
	if extraJSON != "" {
		_ = json.Unmarshal([]byte(extraJSON), &extra)
	}
	return client.LessonAction(courseID, lessonID, action, extra)
}

func (a *App) CMSReorderLessons(courseID, sectionID string, lessonIDs []string) error {
	client, err := a.cmsClient()
	if err != nil {
		return err
	}
	return client.ReorderLessons(courseID, sectionID, lessonIDs)
}

func (a *App) CMSSearch(query string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.Search(query)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (a *App) CMSListInstructors(query string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.ListInstructors(query)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (a *App) CMSGetPlatformActivity(limit int) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.GetPlatformActivity(limit)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (a *App) CMSGetLessonProtection(courseID, lessonID string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.GetLessonProtection(courseID, lessonID)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func (a *App) CMSValidateLessonProtection(courseID, lessonID string) (string, error) {
	client, err := a.cmsClient()
	if err != nil {
		return "", err
	}
	raw, err := client.ValidateLessonProtection(courseID, lessonID)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

type SystemStats struct {
	CPUPercent   float64 `json:"cpuPercent"`
	DiskTotalGB  float64 `json:"diskTotalGb"`
	DiskFreeGB   float64 `json:"diskFreeGb"`
	DiskUsedPct  float64 `json:"diskUsedPct"`
	MemoryUsedMB float64 `json:"memoryUsedMb"`
}

func (a *App) GetSystemStats() SystemStats {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	stats := SystemStats{
		MemoryUsedMB: float64(mem.Alloc) / 1024 / 1024,
	}

	if total, free, ok := diskSpace(a.configDir); ok && total > 0 {
		stats.DiskTotalGB = float64(total) / 1024 / 1024 / 1024
		stats.DiskFreeGB = float64(free) / 1024 / 1024 / 1024
		stats.DiskUsedPct = (1 - float64(free)/float64(total)) * 100
	}

	return stats
}

// diskSpace is implemented per-platform in disk_windows.go / disk_unix.go.
