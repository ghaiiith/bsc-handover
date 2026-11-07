package auth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"bs-platform-studio/internal/domain"
)

type Service struct {
	configDir string
	client    *http.Client
}

type sessionFile struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresAt    int64  `json:"expiresAt"`
	UserID       string `json:"userId"`
	Email        string `json:"email"`
	FullName     string `json:"fullName"`
}

func New(configDir string) *Service {
	return &Service{
		configDir: configDir,
		client:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *Service) Login(supabaseURL, anonKey, email, password string, remember bool) (*domain.SessionInfo, string, error) {
	url := fmt.Sprintf("%s/auth/v1/token?grant_type=password", trimSlash(supabaseURL))
	payload, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", anonKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, "", fmt.Errorf("login failed: %s", string(raw))
	}

	var result struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
		User         struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, "", err
	}

	role, fullName, err := s.fetchProfile(supabaseURL, anonKey, result.AccessToken, result.User.ID)
	if err != nil {
		return nil, "", err
	}
	if role != "admin" {
		return nil, "", fmt.Errorf("admin access required")
	}

	expiresAt := time.Now().Add(time.Duration(result.ExpiresIn) * time.Second).Unix()
	session := &domain.SessionInfo{
		UserID:    result.User.ID,
		Email:     result.User.Email,
		FullName:  fullName,
		ExpiresAt: expiresAt,
	}

	if remember {
		_ = s.saveSession(sessionFile{
			AccessToken:  result.AccessToken,
			RefreshToken: result.RefreshToken,
			ExpiresAt:    expiresAt,
			UserID:       result.User.ID,
			Email:        result.User.Email,
			FullName:     fullName,
		})
	}

	return session, result.AccessToken, nil
}

func (s *Service) RestoreSession() (*domain.SessionInfo, string, error) {
	raw, err := os.ReadFile(s.sessionPath())
	if err != nil {
		return nil, "", err
	}
	var stored sessionFile
	if err := json.Unmarshal(raw, &stored); err != nil {
		return nil, "", err
	}
	if stored.ExpiresAt <= time.Now().Unix() {
		return nil, "", fmt.Errorf("session expired")
	}
	return &domain.SessionInfo{
		UserID:    stored.UserID,
		Email:     stored.Email,
		FullName:  stored.FullName,
		ExpiresAt: stored.ExpiresAt,
	}, stored.AccessToken, nil
}

func (s *Service) Logout() error {
	return os.Remove(s.sessionPath())
}

func (s *Service) fetchProfile(supabaseURL, anonKey, token, userID string) (role, fullName string, err error) {
	url := fmt.Sprintf("%s/rest/v1/users?id=eq.%s&select=role,full_name", trimSlash(supabaseURL), userID)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("apikey", anonKey)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var rows []struct {
		Role     string `json:"role"`
		FullName string `json:"full_name"`
	}
	if err := json.Unmarshal(raw, &rows); err != nil {
		return "", "", err
	}
	if len(rows) == 0 {
		return "", "", fmt.Errorf("profile not found")
	}
	return rows[0].Role, rows[0].FullName, nil
}

func (s *Service) saveSession(data sessionFile) error {
	if err := os.MkdirAll(s.configDir, 0o755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.sessionPath(), raw, 0o600)
}

func (s *Service) sessionPath() string {
	return filepath.Join(s.configDir, "session.json")
}

func trimSlash(v string) string {
	for len(v) > 0 && v[len(v)-1] == '/' {
		v = v[:len(v)-1]
	}
	return v
}
