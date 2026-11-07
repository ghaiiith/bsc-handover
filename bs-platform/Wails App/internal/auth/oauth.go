package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"bs-platform-studio/internal/domain"
)

const oauthCallbackPath = "/auth/callback"
const oauthListenPort = "38475"
const oauthListenTimeout = 5 * time.Minute

type oauthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	User         struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"user"`
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

// LoginWithGoogle runs Supabase OAuth (Google) via system browser + localhost callback (PKCE).
func (s *Service) LoginWithGoogle(
	supabaseURL, anonKey string,
	remember bool,
	openBrowser func(authURL string) error,
) (*domain.SessionInfo, string, error) {
	if supabaseURL == "" || anonKey == "" {
		return nil, "", fmt.Errorf("configure Supabase URL and anon key in settings first")
	}

	verifier, challenge, err := generatePKCE()
	if err != nil {
		return nil, "", err
	}

	listener, redirectURI, err := listenOAuthCallback()
	if err != nil {
		return nil, "", fmt.Errorf("could not start local callback server: %w", err)
	}
	defer listener.Close()

	authURL, err := buildAuthorizeURL(supabaseURL, anonKey, redirectURI, challenge)
	if err != nil {
		return nil, "", err
	}

	if err := openBrowser(authURL); err != nil {
		return nil, "", fmt.Errorf("could not open browser: %w", err)
	}

	code, oauthErr, err := waitForOAuthCode(listener)
	if err != nil {
		return nil, "", err
	}
	if oauthErr != "" {
		return nil, "", fmt.Errorf("google sign-in cancelled or denied")
	}

	tokenResp, err := exchangePKCECode(supabaseURL, anonKey, code, verifier)
	if err != nil {
		return nil, "", err
	}

	role, fullName, err := s.fetchProfile(supabaseURL, anonKey, tokenResp.AccessToken, tokenResp.User.ID)
	if err != nil {
		return nil, "", err
	}
	if role != "admin" {
		return nil, "", fmt.Errorf("admin access required — your Google account is not an platform admin")
	}

	email := tokenResp.User.Email
	expiresAt := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second).Unix()

	session := &domain.SessionInfo{
		UserID:    tokenResp.User.ID,
		Email:     email,
		FullName:  fullName,
		ExpiresAt: expiresAt,
	}

	if remember {
		_ = s.saveSession(sessionFile{
			AccessToken:  tokenResp.AccessToken,
			RefreshToken: tokenResp.RefreshToken,
			ExpiresAt:    expiresAt,
			UserID:       tokenResp.User.ID,
			Email:        email,
			FullName:     fullName,
		})
	}

	return session, tokenResp.AccessToken, nil
}

func generatePKCE() (verifier, challenge string, err error) {
	buf := make([]byte, 32)
	if _, err = rand.Read(buf); err != nil {
		return "", "", err
	}
	verifier = base64.RawURLEncoding.EncodeToString(buf)
	sum := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(sum[:])
	return verifier, challenge, nil
}

func listenOAuthCallback() (net.Listener, string, error) {
	addr := "127.0.0.1:" + oauthListenPort
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, "", fmt.Errorf("port %s in use — close other apps using it and retry", oauthListenPort)
	}
	redirectURI := fmt.Sprintf("http://127.0.0.1:%s%s", oauthListenPort, oauthCallbackPath)
	return listener, redirectURI, nil
}

func buildAuthorizeURL(supabaseURL, anonKey, redirectURI, challenge string) (string, error) {
	base := trimSlash(supabaseURL) + "/auth/v1/authorize"
	u, err := url.Parse(base)
	if err != nil {
		return "", err
	}
	q := u.Query()
	q.Set("provider", "google")
	q.Set("redirect_to", redirectURI)
	q.Set("code_challenge", challenge)
	q.Set("code_challenge_method", "s256")
	q.Set("apikey", anonKey)
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func waitForOAuthCode(listener net.Listener) (code string, oauthErr string, err error) {
	result := make(chan struct {
		code string
		err  string
	}, 1)

	server := &http.Server{
		ReadHeaderTimeout: 10 * time.Second,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != oauthCallbackPath {
				http.NotFound(w, r)
				return
			}

			q := r.URL.Query()
			if e := q.Get("error"); e != "" {
				result <- struct {
					code string
					err  string
				}{err: e}
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				fmt.Fprint(w, oauthFailureHTML())
				return
			}

			authCode := q.Get("code")
			if authCode == "" {
				result <- struct {
					code string
					err  string
				}{err: "missing_code"}
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				fmt.Fprint(w, oauthFailureHTML())
				return
			}

			result <- struct {
				code string
				err  string
			}{code: authCode}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			fmt.Fprint(w, oauthSuccessHTML())
		}),
	}

	go func() {
		_ = server.Serve(listener)
	}()

	ctx, cancel := context.WithTimeout(context.Background(), oauthListenTimeout)
	defer cancel()

	select {
	case res := <-result:
		_ = server.Shutdown(context.Background())
		if res.err != "" {
			return "", res.err, nil
		}
		return res.code, "", nil
	case <-ctx.Done():
		_ = server.Shutdown(context.Background())
		return "", "", fmt.Errorf("sign-in timed out — complete Google login within 5 minutes")
	}
}

func exchangePKCECode(supabaseURL, anonKey, code, verifier string) (*oauthTokenResponse, error) {
	endpoint := trimSlash(supabaseURL) + "/auth/v1/token?grant_type=pkce"
	body, _ := json.Marshal(map[string]string{
		"auth_code":     code,
		"code_verifier": verifier,
	})

	req, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(string(body)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", anonKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var token oauthTokenResponse
	if err := json.Unmarshal(raw, &token); err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 || token.AccessToken == "" {
		msg := token.ErrorDescription
		if msg == "" {
			msg = token.Error
		}
		if msg == "" {
			msg = string(raw)
		}
		return nil, fmt.Errorf("token exchange failed: %s", msg)
	}
	return &token, nil
}

func oauthSuccessHTML() string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signed in</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#09090b;color:#fafafa;margin:0}
.box{text-align:center;padding:2rem;border:1px solid #27272a;border-radius:12px;background:#18181b}</style></head>
<body><div class="box"><h1>Signed in successfully</h1><p>You can close this tab and return to BS Platform Studio.</p></div></body></html>`
}

func oauthFailureHTML() string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sign-in failed</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#09090b;color:#fafafa;margin:0}
.box{text-align:center;padding:2rem;border:1px solid #27272a;border-radius:12px;background:#18181b;color:#f87171}</style></head>
<body><div class="box"><h1>Sign-in failed</h1><p>Return to BS Platform Studio and try again.</p></div></body></html>`
}
