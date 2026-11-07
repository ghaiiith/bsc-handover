package upload

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const partSize = 16 * 1024 * 1024

type Client struct {
	BaseURL     string
	AccessToken string
	HTTP        *http.Client
	Concurrency int
}

type CreateResponse struct {
	AssetID  string `json:"assetId"`
	Key      string `json:"key"`
	UploadID string `json:"uploadId"`
	Parts    []struct {
		PartNumber int    `json:"partNumber"`
		URL        string `json:"url"`
	} `json:"parts"`
}

type CompleteResponse struct {
	OK      bool   `json:"ok"`
	AssetID string `json:"assetId"`
	Status  string `json:"status"`
}

func (c *Client) UploadFile(courseID, objectKey, filePath string, durationSeconds *int) (assetID string, err error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return "", err
	}

	contentType := mime.TypeByExtension(filepath.Ext(filePath))
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	partCount := int((info.Size() + partSize - 1) / partSize)
	if partCount < 1 {
		partCount = 1
	}

	created, err := c.createUpload(courseID, objectKey, filepath.Base(filePath), contentType, info.Size(), partCount)
	if err != nil {
		return "", err
	}

	parts, err := c.uploadParts(filePath, created.Parts)
	if err != nil {
		_ = c.abort(created.Key, created.UploadID, created.AssetID)
		return "", err
	}

	completed, err := c.completeUpload(created.Key, created.UploadID, parts, created.AssetID, int(info.Size()), durationSeconds, contentType)
	if err != nil {
		return "", err
	}

	if completed.AssetID != "" {
		return completed.AssetID, nil
	}
	return created.AssetID, nil
}

func (c *Client) createUpload(courseID, objectKey, filename, contentType string, size int64, partCount int) (*CreateResponse, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"courseId":    courseID,
		"objectKey":   objectKey,
		"filename":    filename,
		"contentType": contentType,
		"fileSize":    size,
		"partCount":   partCount,
	})
	return postJSON[CreateResponse](c, "/api/studio/upload/create", body)
}

func (c *Client) uploadParts(filePath string, presigned []struct {
	PartNumber int    `json:"partNumber"`
	URL        string `json:"url"`
}) ([]map[string]interface{}, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}
	concurrency := c.Concurrency
	if concurrency <= 0 {
		concurrency = 4
	}

	type partResult struct {
		partNumber int
		etag       string
		err        error
	}

	sem := make(chan struct{}, concurrency)
	results := make([]partResult, len(presigned))
	var wg sync.WaitGroup

	for i, part := range presigned {
		wg.Add(1)
		go func(idx int, p struct {
			PartNumber int    `json:"partNumber"`
			URL        string `json:"url"`
		}) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			start := int64(p.PartNumber-1) * partSize
			end := start + partSize
			if end > info.Size() {
				end = info.Size()
			}
			size := end - start

			partFile, err := os.Open(filePath)
			if err != nil {
				results[idx] = partResult{partNumber: p.PartNumber, err: err}
				return
			}
			chunk := make([]byte, size)
			if _, err := partFile.ReadAt(chunk, start); err != nil && err != io.EOF {
				partFile.Close()
				results[idx] = partResult{partNumber: p.PartNumber, err: err}
				return
			}
			partFile.Close()

			req, err := http.NewRequest(http.MethodPut, p.URL, bytes.NewReader(chunk))
			if err != nil {
				results[idx] = partResult{partNumber: p.PartNumber, err: err}
				return
			}
			req.ContentLength = size

			resp, err := c.http().Do(req)
			if err != nil {
				results[idx] = partResult{partNumber: p.PartNumber, err: err}
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				results[idx] = partResult{partNumber: p.PartNumber, err: fmt.Errorf("part upload status %d", resp.StatusCode)}
				return
			}

			etag := strings.Trim(resp.Header.Get("ETag"), "\"")
			results[idx] = partResult{partNumber: p.PartNumber, etag: etag}
		}(i, part)
	}

	wg.Wait()

	out := make([]map[string]interface{}, 0, len(results))
	for _, r := range results {
		if r.err != nil {
			return nil, r.err
		}
		out = append(out, map[string]interface{}{
			"partNumber": r.partNumber,
			"etag":       r.etag,
		})
	}
	return out, nil
}

func (c *Client) completeUpload(objectKey, uploadID string, parts []map[string]interface{}, assetID string, fileSize int, durationSeconds *int, mimeType string) (*CompleteResponse, error) {
	payload := map[string]interface{}{
		"objectKey": objectKey,
		"uploadId":  uploadID,
		"parts":     parts,
		"fileSize":  fileSize,
		"mimeType":  mimeType,
	}
	if assetID != "" {
		payload["assetId"] = assetID
	}
	if durationSeconds != nil {
		payload["durationSeconds"] = *durationSeconds
	}
	body, _ := json.Marshal(payload)
	return postJSON[CompleteResponse](c, "/api/studio/upload/complete", body)
}

func (c *Client) abort(objectKey, uploadID, assetID string) error {
	payload := map[string]interface{}{
		"objectKey": objectKey,
		"uploadId":  uploadID,
	}
	if assetID != "" {
		payload["assetId"] = assetID
	}
	body, _ := json.Marshal(payload)
	_, err := postJSON[map[string]interface{}](c, "/api/studio/upload/abort", body)
	return err
}

func (c *Client) Publish(courseID, lessonID, sourceAssetID string, durationMinutes int) error {
	body, _ := json.Marshal(map[string]interface{}{
		"courseId":        courseID,
		"lessonId":        lessonID,
		"sourceAssetId":   sourceAssetID,
		"durationMinutes": durationMinutes,
	})
	_, err := postJSON[map[string]interface{}](c, "/api/studio/publish", body)
	return err
}

func (c *Client) RegisterEncryptionKey(courseID, lessonID, keyBase64, ivHex string) error {
	body, _ := json.Marshal(map[string]interface{}{
		"courseId":          courseID,
		"lessonId":          lessonID,
		"keyBase64":         keyBase64,
		"ivHex":             ivHex,
		"encryptionVersion": 1,
		"processingVersion": 1,
	})
	_, err := postJSON[map[string]interface{}](c, "/api/studio/protection/register-key", body)
	return err
}

func postJSON[T any](c *Client, path string, body []byte) (*T, error) {
	req, err := http.NewRequest(http.MethodPost, strings.TrimRight(c.BaseURL, "/")+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.AccessToken)

	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("upload api %s: %s", path, string(raw))
	}

	var out T
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return http.DefaultClient
}

func ObjectKey(courseID, lessonID, relative string) string {
	return fmt.Sprintf("courses/%s/%s/%s", courseID, lessonID, strings.TrimPrefix(relative, "/"))
}

func WalkFiles(root string) ([]string, error) {
	var files []string
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			files = append(files, path)
		}
		return nil
	})
	return files, err
}
