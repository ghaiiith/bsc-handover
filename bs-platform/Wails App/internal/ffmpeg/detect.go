package ffmpeg

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"bs-platform-studio/internal/domain"
)

type Toolkit struct {
	FFmpegPath  string
	FFprobePath string
}

func DetectNearExecutable(explicitFFmpeg, explicitFFprobe string) domain.DetectResult {
	if explicitFFmpeg != "" && explicitFFprobe != "" {
		if fileExists(explicitFFmpeg) && fileExists(explicitFFprobe) {
			return domain.DetectResult{
				FFmpegPath:  explicitFFmpeg,
				FFprobePath: explicitFFprobe,
				Found:       true,
			}
		}
	}

	exeDir := executableDir()
	names := []struct{ ff, fp string }{
		{"ffmpeg.exe", "ffprobe.exe"},
		{"ffmpeg", "ffprobe"},
	}

	for _, n := range names {
		ff := filepath.Join(exeDir, n.ff)
		fp := filepath.Join(exeDir, n.fp)
		if fileExists(ff) && fileExists(fp) {
			return domain.DetectResult{FFmpegPath: ff, FFprobePath: fp, Found: true}
		}
	}

	// Bundled bin/ folder (dev layout)
	binDir := filepath.Join(exeDir, "bin")
	ff := filepath.Join(binDir, names[0].ff)
	fp := filepath.Join(binDir, names[0].fp)
	if runtime.GOOS != "windows" {
		ff = filepath.Join(binDir, "ffmpeg")
		fp = filepath.Join(binDir, "ffprobe")
	}
	if fileExists(ff) && fileExists(fp) {
		return domain.DetectResult{FFmpegPath: ff, FFprobePath: fp, Found: true}
	}

	return domain.DetectResult{Found: false}
}

func NewToolkit(d domain.DetectResult) (*Toolkit, error) {
	if !d.Found {
		return nil, fmt.Errorf("ffmpeg/ffprobe not found beside executable")
	}
	return &Toolkit{FFmpegPath: d.FFmpegPath, FFprobePath: d.FFprobePath}, nil
}

func (t *Toolkit) Probe(path string) (*domain.VideoProbe, error) {
	cmd := exec.Command(t.FFprobePath,
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		path,
	)
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ffprobe failed: %w", err)
	}

	var payload struct {
		Format struct {
			Duration string `json:"duration"`
			BitRate  string `json:"bit_rate"`
			Format   string `json:"format_name"`
		} `json:"format"`
		Streams []struct {
			CodecType  string            `json:"codec_type"`
			CodecName  string            `json:"codec_name"`
			Width      int               `json:"width"`
			Height     int               `json:"height"`
			RFrameRate string            `json:"r_frame_rate"`
			Tags       map[string]string `json:"tags"`
		} `json:"streams"`
	}
	if err := json.Unmarshal(out, &payload); err != nil {
		return nil, err
	}

	info, _ := os.Stat(path)
	probe := &domain.VideoProbe{
		ContainerFormat: payload.Format.Format,
		FileSize:        info.Size(),
	}

	if payload.Format.BitRate != "" {
		if v, err := strconv.ParseInt(payload.Format.BitRate, 10, 64); err == nil {
			probe.Bitrate = v
		}
	}
	if payload.Format.Duration != "" {
		if v, err := strconv.ParseFloat(payload.Format.Duration, 64); err == nil {
			probe.DurationSeconds = v
		}
	}

	for _, stream := range payload.Streams {
		switch stream.CodecType {
		case "video":
			probe.Width = stream.Width
			probe.Height = stream.Height
			probe.VideoCodec = stream.CodecName
			probe.Resolution = fmt.Sprintf("%dx%d", stream.Width, stream.Height)
			probe.FPS = parseFPS(stream.RFrameRate)
			if rotate, ok := stream.Tags["rotate"]; ok {
				if deg, err := strconv.Atoi(rotate); err == nil {
					probe.Rotation = deg
				}
			}
			if probe.Width > 0 && probe.Height > 0 {
				probe.AspectRatio = fmt.Sprintf("%.2f", float64(probe.Width)/float64(probe.Height))
			}
		case "audio":
			probe.AudioCodec = stream.CodecName
		}
	}

	return probe, nil
}

func parseFPS(raw string) float64 {
	parts := strings.Split(raw, "/")
	if len(parts) != 2 {
		return 0
	}
	num, err1 := strconv.ParseFloat(parts[0], 64)
	den, err2 := strconv.ParseFloat(parts[1], 64)
	if err1 != nil || err2 != nil || den == 0 {
		return 0
	}
	return num / den
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}

func executableDir() string {
	exe, err := os.Executable()
	if err != nil {
		return "."
	}
	return filepath.Dir(exe)
}
