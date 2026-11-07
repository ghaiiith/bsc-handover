package cms

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

func New(baseURL, token string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		http:    &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *Client) SetToken(token string) {
	c.token = token
}

func (c *Client) do(method, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}

	req, err := http.NewRequest(method, c.baseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		var errBody struct {
			Error string `json:"error"`
		}
		_ = json.Unmarshal(raw, &errBody)
		msg := errBody.Error
		if msg == "" {
			msg = string(raw)
		}
		return fmt.Errorf("%s", msg)
	}

	if out != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, out); err != nil {
			return err
		}
	}
	return nil
}

func (c *Client) get(path string, out any) error {
	return c.do(http.MethodGet, path, nil, out)
}

func (c *Client) post(path string, body any, out any) error {
	return c.do(http.MethodPost, path, body, out)
}

func (c *Client) patch(path string, body any, out any) error {
	return c.do(http.MethodPatch, path, body, out)
}

func (c *Client) put(path string, body any, out any) error {
	return c.do(http.MethodPut, path, body, out)
}

func (c *Client) delete(path string) error {
	return c.do(http.MethodDelete, path, nil, nil)
}

func (c *Client) ListCourses(params url.Values) (json.RawMessage, error) {
	path := "/api/studio/cms/courses"
	if len(params) > 0 {
		path += "?" + params.Encode()
	}
	var out json.RawMessage
	err := c.get(path, &out)
	return out, err
}

func (c *Client) GetCourse(courseID string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.get("/api/studio/cms/courses/"+courseID, &out)
	return out, err
}

func (c *Client) CreateCourse(body map[string]string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.post("/api/studio/cms/courses", body, &out)
	return out, err
}

func (c *Client) UpdateCourse(courseID string, body map[string]any) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.patch("/api/studio/cms/courses/"+courseID, body, &out)
	return out, err
}

func (c *Client) DeleteCourse(courseID string) error {
	return c.delete("/api/studio/cms/courses/" + courseID)
}

func (c *Client) CourseAction(courseID, action string) error {
	return c.post("/api/studio/cms/courses/"+courseID+"/"+action, nil, nil)
}

func (c *Client) DuplicateCourse(courseID string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.post("/api/studio/cms/courses/"+courseID+"/duplicate", nil, &out)
	return out, err
}

func (c *Client) BulkCourses(courseIDs []string, action string) error {
	return c.post("/api/studio/cms/courses/bulk", map[string]any{
		"courseIds": courseIDs,
		"action":    action,
	}, nil)
}

func (c *Client) GetCurriculum(courseID string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.get("/api/studio/cms/courses/"+courseID+"/curriculum", &out)
	return out, err
}

func (c *Client) CreateSection(courseID string, title, titleAr string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.post("/api/studio/cms/courses/"+courseID+"/sections", map[string]string{
		"title":    title,
		"title_ar": titleAr,
	}, &out)
	return out, err
}

func (c *Client) UpdateSection(courseID, sectionID string, body map[string]string) error {
	return c.patch("/api/studio/cms/courses/"+courseID+"/sections/"+sectionID, body, nil)
}

func (c *Client) DeleteSection(courseID, sectionID string) error {
	return c.delete("/api/studio/cms/courses/" + courseID + "/sections/" + sectionID)
}

func (c *Client) ReorderSections(courseID string, sectionIDs []string) error {
	return c.put("/api/studio/cms/courses/"+courseID+"/sections", map[string]any{
		"sectionIds": sectionIDs,
	}, nil)
}

func (c *Client) CreateLesson(courseID string, body map[string]any) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.post("/api/studio/cms/courses/"+courseID+"/lessons", body, &out)
	return out, err
}

func (c *Client) GetLesson(courseID, lessonID string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.get("/api/studio/cms/courses/"+courseID+"/lessons/"+lessonID, &out)
	return out, err
}

func (c *Client) UpdateLesson(courseID, lessonID string, body map[string]any) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.patch("/api/studio/cms/courses/"+courseID+"/lessons/"+lessonID, body, &out)
	return out, err
}

func (c *Client) DeleteLesson(courseID, lessonID string) error {
	return c.delete("/api/studio/cms/courses/" + courseID + "/lessons/" + lessonID)
}

func (c *Client) DuplicateLesson(courseID, lessonID string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.post("/api/studio/cms/courses/"+courseID+"/lessons/"+lessonID+"/duplicate", nil, &out)
	return out, err
}

func (c *Client) LessonAction(courseID, lessonID, action string, extra map[string]any) error {
	body := map[string]any{"action": action}
	for k, v := range extra {
		body[k] = v
	}
	return c.post("/api/studio/cms/courses/"+courseID+"/lessons/"+lessonID+"/actions", body, nil)
}

func (c *Client) ReorderLessons(courseID, sectionID string, lessonIDs []string) error {
	return c.put("/api/studio/cms/courses/"+courseID+"/lessons", map[string]any{
		"sectionId": sectionID,
		"lessonIds": lessonIDs,
	}, nil)
}

func (c *Client) Search(q string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.get("/api/studio/cms/search?q="+url.QueryEscape(q), &out)
	return out, err
}

func (c *Client) ListInstructors(q string) (json.RawMessage, error) {
	path := "/api/studio/cms/instructors"
	if q != "" {
		path += "?q=" + url.QueryEscape(q)
	}
	var out json.RawMessage
	err := c.get(path, &out)
	return out, err
}

func (c *Client) GetPlatformActivity(limit int) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.get(fmt.Sprintf("/api/studio/cms/activity?limit=%d", limit), &out)
	return out, err
}

func (c *Client) GetLessonProtection(courseID, lessonID string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.get(fmt.Sprintf("/api/studio/protection/%s/lessons/%s", courseID, lessonID), &out)
	return out, err
}

func (c *Client) ValidateLessonProtection(courseID, lessonID string) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.do(http.MethodPost, fmt.Sprintf("/api/studio/protection/%s/lessons/%s", courseID, lessonID), nil, &out)
	return out, err
}
