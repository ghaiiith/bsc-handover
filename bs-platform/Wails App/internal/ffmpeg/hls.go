package ffmpeg

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

var defaultVariants = []struct {
	name   string
	height int
	bitrate string
}{
	{"1080", 1080, "5000k"},
	{"720", 720, "2800k"},
	{"480", 480, "1400k"},
	{"360", 360, "800k"},
}

type HLSOptions struct {
	OutputDir     string
	SegmentLength int
	Threads       int
	SourceHeight  int
}

type HLSResult struct {
	MasterPath     string
	VariantNames   []string
	SegmentCount   int
	EncryptionKey  []byte
	IvHex          string
	Encrypted      bool
}

func (t *Toolkit) GenerateHLS(sourcePath string, opts HLSOptions) (*HLSResult, error) {
	if err := os.MkdirAll(opts.OutputDir, 0o755); err != nil {
		return nil, err
	}

	hlsDir := filepath.Join(opts.OutputDir, "hls")
	if err := os.MkdirAll(hlsDir, 0o755); err != nil {
		return nil, err
	}

	_, keyInfoPath, ivHex, keyBytes, err := prepareHLSEncryption(hlsDir)
	if err != nil {
		return nil, fmt.Errorf("encryption setup: %w", err)
	}

	segLen := opts.SegmentLength
	if segLen <= 0 {
		segLen = 6
	}

	var variants []struct {
		name   string
		height int
		bitrate string
	}
	for _, v := range defaultVariants {
		if v.height <= opts.SourceHeight {
			variants = append(variants, v)
		}
	}
	if len(variants) == 0 {
		variants = append(variants, defaultVariants[len(defaultVariants)-1])
	}

	var masterLines []string
	var variantNames []string
	totalSegments := 0

	for _, v := range variants {
		variantDir := filepath.Join(hlsDir, v.name)
		if err := os.MkdirAll(variantDir, 0o755); err != nil {
			return nil, err
		}

		playlist := filepath.Join(variantDir, "playlist.m3u8")
		segmentPattern := filepath.Join(variantDir, "segment_%03d.ts")

		args := []string{
			"-y", "-i", sourcePath,
			"-vf", fmt.Sprintf("scale=-2:%d", v.height),
			"-c:v", "libx264", "-preset", "fast",
			"-b:v", v.bitrate,
			"-c:a", "aac", "-b:a", "128k", "-ac", "2",
			"-f", "hls",
			"-hls_time", fmt.Sprintf("%d", segLen),
			"-hls_playlist_type", "vod",
			"-hls_key_info_file", keyInfoPath,
			"-hls_segment_filename", segmentPattern,
			playlist,
		}
		if opts.Threads > 0 {
			args = append([]string{"-threads", fmt.Sprintf("%d", opts.Threads)}, args...)
		}

		cmd := exec.Command(t.FFmpegPath, args...)
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("hls %sp failed: %w", v.name, err)
		}

		entries, _ := os.ReadDir(variantDir)
		for _, e := range entries {
			if strings.HasSuffix(e.Name(), ".ts") {
				totalSegments++
			}
		}

		bandwidth := parseBitrateK(v.bitrate) * 1000
		masterLines = append(masterLines, fmt.Sprintf(
			"#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d\n%s/playlist.m3u8",
			bandwidth, int(float64(v.height)*16/9), v.height, v.name,
		))
		variantNames = append(variantNames, v.name)
	}

	masterPath := filepath.Join(hlsDir, "master.m3u8")
	masterContent := "#EXTM3U\n#EXT-X-VERSION:3\n" + strings.Join(masterLines, "\n") + "\n"
	if err := os.WriteFile(masterPath, []byte(masterContent), 0o644); err != nil {
		return nil, err
	}

	return &HLSResult{
		MasterPath:    masterPath,
		VariantNames:  variantNames,
		SegmentCount:  totalSegments,
		EncryptionKey: keyBytes,
		IvHex:         ivHex,
		Encrypted:     true,
	}, nil
}

func parseBitrateK(raw string) int {
	raw = strings.TrimSuffix(raw, "k")
	v, _ := fmt.Sscanf(raw, "%d", new(int))
	if v == 0 {
		return 800
	}
	var n int
	fmt.Sscanf(raw, "%d", &n)
	if n == 0 {
		return 800
	}
	return n
}
