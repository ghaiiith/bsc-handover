# BS Platform Studio

Desktop content production tool for the EduWork platform (Phase 2).

**Stack:** Wails v2 · Go · React · TypeScript · Tailwind CSS · FFmpeg · FFprobe

## What it does

- Admin-only login (Supabase Auth)
- Browse courses & lessons from Supabase
- Import videos (browse, folder)
- FFprobe analysis before processing
- FFmpeg: adaptive HLS (1080/720/480/360), thumbnails, metadata JSON
- Upload all assets via **Phase 1-compatible** studio API (`/api/studio/upload/*`)
- One-click **Publish** → links `video_asset_id` on the lesson

## Prerequisites

1. **EduWork web platform** running with Phase 1 R2 configured
2. **Admin account** on the platform
3. **FFmpeg + FFprobe** beside the executable (included in `bin/` for dev)

## Authentication

Sign in with **Google** (same account as the web platform) or email/password. Admin role required.

### Google sign-in setup (one-time)

In **Supabase Dashboard → Authentication → URL Configuration**, add this redirect URL:

```
http://127.0.0.1:38475/auth/callback
```

Ensure Google OAuth is enabled under **Authentication → Providers → Google** (same as the web app).

### Settings (required before login)

Configure Supabase in `%AppData%\BS Platform Studio\settings.json` before first login:

| Field | Example |
|---|---|
| Platform URL | `http://localhost:3000` |
| Supabase URL | `https://xxx.supabase.co` |
| Supabase Anon Key | from Supabase dashboard |

Session is stored locally when "Remember session" is enabled.

## FFmpeg layout

```
BS Platform Studio.exe
ffmpeg.exe
ffprobe.exe
```

Or use the bundled `bin/` folder during development.

## Development

```powershell
cd "C:\Projects\Ali Platform\Wails App\frontend"
npm install
npm run build

cd ..
go mod tidy
wails dev
```

## Production build

```powershell
cd "C:\Projects\Ali Platform\Wails App"
npm run build --prefix frontend
wails build
```

Copy `ffmpeg.exe` and `ffprobe.exe` next to the output executable.

## Desktop CMS (Phase 2 extension)

The studio app is now a full **admin CMS** for courses, curriculum, and video production. All CMS operations go through authenticated Next.js APIs — not direct database access from the desktop.

### CMS API routes (new — does not modify Phase 1 upload routes)

| Route | Purpose |
|---|---|
| `GET/POST /api/studio/cms/courses` | List / create courses |
| `GET/PATCH/DELETE /api/studio/cms/courses/[id]` | Course CRUD |
| `POST .../publish`, `unpublish`, `archive`, `duplicate` | Course actions |
| `POST /api/studio/cms/courses/bulk` | Bulk publish / unpublish / archive / delete |
| `GET .../curriculum` | Sections + lessons with video status |
| `POST/PUT .../sections` | Create / reorder sections |
| `POST .../lessons` | Create / reorder lessons |
| `GET/PATCH/DELETE .../lessons/[id]` | Lesson CRUD |
| `GET /api/studio/cms/search` | Global search |
| `GET /api/studio/cms/activity` | Platform activity feed |

Upload/publish pipeline remains on existing `/api/studio/upload/*` and `/api/studio/publish`.


Studio uses **new** Phase 2 API routes (Phase 1 playback unchanged):

| Route | Purpose |
|---|---|
| `POST /api/studio/upload/create` | Presigned multipart init (any asset under `courses/{courseId}/{lessonId}/…`) |
| `POST /api/studio/upload/complete` | Finalize upload |
| `POST /api/studio/upload/abort` | Abort / cleanup |
| `POST /api/studio/publish` | Link source asset → lesson |

Auth: `Authorization: Bearer <supabase_access_token>` (admin only).

### R2 object layout

```
courses/{courseId}/{lessonId}/
  source/video.mp4
  hls/master.m3u8
  hls/{1080,720,480,360}/...
  thumbnails/...
  metadata/processing.json
```

## Queue

Jobs persist to `%AppData%\BS Platform Studio\queue.json` and survive restarts.

Statuses: waiting → analyzing → processing → generating HLS → thumbnails → uploading → publishing → completed.

Controls: pause, resume, retry, cancel, reorder (API ready).

## Not included (Phase 3)

DRM, AES-128 HLS encryption, watermark, anti-download.
