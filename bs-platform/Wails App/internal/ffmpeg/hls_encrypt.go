package ffmpeg

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// prepareHLSEncryption creates a per-lesson AES-128 key and FFmpeg keyinfo file.
// The key file is never uploaded to R2 — only used locally during encoding.
func prepareHLSEncryption(hlsDir string) (keyPath, keyInfoPath, ivHex string, keyBytes []byte, err error) {
	keyBytes = make([]byte, 16)
	if _, err = rand.Read(keyBytes); err != nil {
		return "", "", "", nil, err
	}

	iv := make([]byte, 16)
	if _, err = rand.Read(iv); err != nil {
		return "", "", "", nil, err
	}
	ivHex = hex.EncodeToString(iv)

	keyPath = filepath.Join(hlsDir, ".encryption.key")
	if err = os.WriteFile(keyPath, keyBytes, 0o600); err != nil {
		return "", "", "", nil, err
	}

	keyInfoPath = filepath.Join(hlsDir, "keyinfo.txt")
	// URI is rewritten by the Next.js HLS proxy to the authenticated key endpoint.
	content := fmt.Sprintf("encryption.key\n%s\n%s\n", keyPath, ivHex)
	if err = os.WriteFile(keyInfoPath, []byte(content), 0o644); err != nil {
		return "", "", "", nil, err
	}

	return keyPath, keyInfoPath, ivHex, keyBytes, nil
}

func ShouldSkipHLSUpload(relative string) bool {
	relative = strings.ToLower(relative)
	if strings.Contains(relative, ".encryption.key") {
		return true
	}
	if strings.HasSuffix(relative, "keyinfo.txt") {
		return true
	}
	return false
}
