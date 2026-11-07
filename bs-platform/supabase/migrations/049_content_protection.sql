-- Phase 3: Content Protection & Secure Streaming
-- Extends Phase 1/2 without modifying existing tables' core semantics.

-- Per-lesson encryption keys (NEVER stored in R2)
CREATE TABLE IF NOT EXISTS lesson_encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  key_ciphertext text NOT NULL,
  iv_hex text NOT NULL,
  encryption_method text NOT NULL DEFAULT 'aes-128',
  encryption_version integer NOT NULL DEFAULT 1,
  processing_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  UNIQUE (lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_encryption_keys_course
  ON lesson_encryption_keys(course_id);

-- Per-lesson protection & asset health metadata
CREATE TABLE IF NOT EXISTS lesson_content_protection (
  lesson_id uuid PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  encryption_status text NOT NULL DEFAULT 'none'
    CHECK (encryption_status IN ('none', 'pending', 'encrypted', 'failed')),
  protection_status text NOT NULL DEFAULT 'standard'
    CHECK (protection_status IN ('standard', 'protected', 'degraded')),
  asset_health text NOT NULL DEFAULT 'unknown'
    CHECK (asset_health IN ('unknown', 'healthy', 'degraded', 'critical')),
  asset_health_details jsonb,
  last_validation_at timestamptz,
  last_validation_version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_content_protection_course
  ON lesson_content_protection(course_id);

-- Short-lived playback sessions
CREATE TABLE IF NOT EXISTS playback_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_validated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  client_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playback_sessions_user_lesson
  ON playback_sessions(user_id, lesson_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_playback_sessions_expires
  ON playback_sessions(expires_at)
  WHERE revoked_at IS NULL;

-- Structured security audit log
CREATE TABLE IF NOT EXISTS video_security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  session_id uuid REFERENCES playback_sessions(id) ON DELETE SET NULL,
  client_ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_security_logs_event_created
  ON video_security_logs(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_security_logs_lesson
  ON video_security_logs(lesson_id, created_at DESC);

-- RLS: service-role only (Next.js admin client). No client direct access.
ALTER TABLE lesson_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_content_protection ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_security_logs ENABLE ROW LEVEL SECURITY;
