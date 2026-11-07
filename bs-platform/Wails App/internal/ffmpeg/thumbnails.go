package ffmpeg

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type ThumbnailOptions struct {
	OutputDir        string
	Interval         int
	DurationSeconds  float64
}

type ThumbnailResult struct {
	PosterPath   string
	CoverPath    string
	PreviewPath  string
	TimelineDir  string
	TimelineCount int
}

func (t *Toolkit) GenerateThumbnails(sourcePath string, opts ThumbnailOptions) (*ThumbnailResult, error) {
	outDir := filepath.Join(opts.OutputDir, "thumbnails")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return nil, err
	}

	poster := filepath.Join(outDir, "poster.jpg")
	cover := filepath.Join(outDir, "cover.jpg")
	preview := filepath.Join(outDir, "preview.jpg")
	timelineDir := filepath.Join(outDir, "timeline")

	if err := os.MkdirAll(timelineDir, 0o755); err != nil {
		return nil, err
	}

	duration := opts.DurationSeconds
	if duration <= 0 {
		if probe, err := t.Probe(sourcePath); err == nil && probe.DurationSeconds > 0 {
			duration = probe.DurationSeconds
		}
	}

	// Poster — frame at 10%
	if err := t.extractFrameAtRatio(sourcePath, poster, duration, 0.10); err != nil {
		return nil, err
	}
	// Cover — frame at 5%
	if err := t.extractFrameAtRatio(sourcePath, cover, duration, 0.05); err != nil {
		return nil, err
	}
	// Preview — frame at 15%
	if err := t.extractFrameAtRatio(sourcePath, preview, duration, 0.15); err != nil {
		return nil, err
	}

	interval := opts.Interval
	if interval <= 0 {
		interval = 10
	}

	timelinePattern := filepath.Join(timelineDir, "thumb_%04d.jpg")
	cmd := exec.Command(t.FFmpegPath,
		"-y", "-i", sourcePath,
		"-vf", fmt.Sprintf("fps=1/%d,scale=320:-1", interval),
		timelinePattern,
	)
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("timeline thumbnails failed: %w", err)
	}

	count := 0
	entries, _ := os.ReadDir(timelineDir)
	for _, e := range entries {
		if strings.HasSuffix(strings.ToLower(e.Name()), ".jpg") {
			count++
		}
	}

	return &ThumbnailResult{
		PosterPath:    poster,
		CoverPath:     cover,
		PreviewPath:   preview,
		TimelineDir:   timelineDir,
		TimelineCount: count,
	}, nil
}

func (t *Toolkit) extractFrameAtRatio(source, dest string, duration, ratio float64) error {
	seek := duration * ratio
	if seek < 0 {
		seek = 0
	}
	return t.extractFrame(source, dest, seek)
}

func (t *Toolkit) extractFrame(source, dest string, seekSeconds float64) error {
	cmd := exec.Command(t.FFmpegPath,
		"-y", "-ss", fmt.Sprintf("%.3f", seekSeconds), "-i", source,
		"-frames:v", "1", "-q:v", "2", dest,
	)
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("thumbnail extract at %.1fs failed: %w", seekSeconds, err)
	}
	return nil
}

func (t *Toolkit) CopySourceMP4(sourcePath, destPath string) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
		return err
	}
	cmd := exec.Command(t.FFmpegPath,
		"-y", "-i", sourcePath,
		"-c", "copy",
		"-movflags", "+faststart",
		destPath,
	)
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
