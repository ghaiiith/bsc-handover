package supabase

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"bs-platform-studio/internal/domain"
)

type Client struct {
	URL     string
	AnonKey string
	Token   string
	HTTP    *http.Client
}

func New(url, anonKey, token string) *Client {
	return &Client{
		URL:     strings.TrimRight(url, "/"),
		AnonKey: anonKey,
		Token:   token,
		HTTP:    &http.Client{Timeout: 45 * time.Second},
	}
}

func (c *Client) ListCourses() ([]domain.CourseRow, error) {
	url := c.URL + "/rest/v1/courses?select=id,title,title_ar,status,total_lessons,thumbnail_url&order=updated_at.desc"
	var rows []struct {
		ID           string  `json:"id"`
		Title        string  `json:"title"`
		TitleAr      string  `json:"title_ar"`
		Status       string  `json:"status"`
		TotalLessons int     `json:"total_lessons"`
		ThumbnailURL *string `json:"thumbnail_url"`
	}
	if err := c.getJSON(url, &rows); err != nil {
		return nil, err
	}
	out := make([]domain.CourseRow, len(rows))
	for i, r := range rows {
		out[i] = domain.CourseRow{
			ID:           r.ID,
			Title:        r.Title,
			TitleAr:      r.TitleAr,
			Status:       r.Status,
			TotalLessons: r.TotalLessons,
		}
		if r.ThumbnailURL != nil {
			out[i].ThumbnailURL = *r.ThumbnailURL
		}
	}
	return out, nil
}

func (c *Client) ListLessons(courseID string) ([]domain.LessonRow, error) {
	url := fmt.Sprintf(
		"%s/rest/v1/lessons?course_id=eq.%s&select=id,course_id,section_id,title,title_ar,duration_minutes,video_asset_id,order_index,video_assets(status)&order=order_index.asc",
		c.URL, courseID,
	)
	var rows []struct {
		ID              string  `json:"id"`
		CourseID        string  `json:"course_id"`
		SectionID       string  `json:"section_id"`
		Title           string  `json:"title"`
		TitleAr         string  `json:"title_ar"`
		DurationMinutes int     `json:"duration_minutes"`
		VideoAssetID    *string `json:"video_asset_id"`
		OrderIndex      int     `json:"order_index"`
		VideoAssets     *struct {
			Status string `json:"status"`
		} `json:"video_assets"`
	}
	if err := c.getJSON(url, &rows); err != nil {
		return nil, err
	}
	out := make([]domain.LessonRow, len(rows))
	for i, r := range rows {
		out[i] = domain.LessonRow{
			ID:              r.ID,
			CourseID:        r.CourseID,
			SectionID:       r.SectionID,
			Title:           r.Title,
			TitleAr:         r.TitleAr,
			DurationMinutes: r.DurationMinutes,
			VideoAssetID:    r.VideoAssetID,
			OrderIndex:      r.OrderIndex,
		}
		if r.VideoAssets != nil {
			out[i].AssetStatus = r.VideoAssets.Status
		}
	}
	return out, nil
}

func (c *Client) DashboardStats() (*domain.DashboardStats, error) {
	courses, err := c.ListCourses()
	if err != nil {
		return nil, err
	}

	stats := &domain.DashboardStats{TotalCourses: len(courses)}
	for _, course := range courses {
		stats.TotalLessons += course.TotalLessons
		lessons, err := c.ListLessons(course.ID)
		if err != nil {
			continue
		}
		for _, lesson := range lessons {
			if lesson.VideoAssetID != nil && lesson.AssetStatus == "ready" {
				stats.VideosReady++
			}
		}
	}
	return stats, nil
}

func (c *Client) getJSON(url string, dest interface{}) error {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", c.AnonKey)
	req.Header.Set("Authorization", "Bearer "+c.Token)

	resp, err := c.http().Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return fmt.Errorf("supabase error: %s", string(raw))
	}
	return json.Unmarshal(raw, dest)
}

func (c *Client) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return http.DefaultClient
}
