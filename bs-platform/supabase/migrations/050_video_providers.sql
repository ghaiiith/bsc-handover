-- Phase 4: Multi-provider video architecture (extends Phase 1–3, backward compatible)

-- Provider configuration (admin-managed)
CREATE TABLE IF NOT EXISTS video_provider_settings (
  provider_id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'offline'
    CHECK (status IN ('healthy', 'warning', 'degraded', 'offline')),
  region text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_health_check timestamptz,
  last_error text,
  estimated_monthly_cost_usd numeric(12,4) NOT NULL DEFAULT 0,
  estimated_storage_cost_usd numeric(12,4) NOT NULL DEFAULT 0,
  estimated_streaming_cost_usd numeric(12,4) NOT NULL DEFAULT 0,
  estimated_upload_cost_usd numeric(12,4) NOT NULL DEFAULT 0,
  estimated_api_cost_usd numeric(12,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Health check history
CREATE TABLE IF NOT EXISTS provider_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('healthy', 'warning', 'degraded', 'offline')),
  latency_ms integer,
  api_response_ms integer,
  upload_response_ms integer,
  playback_response_ms integer,
  storage_status text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_health_logs_provider_created
  ON provider_health_logs(provider_id, created_at DESC);

-- Extend video_assets (existing rows default to r2 — no breakage)
ALTER TABLE video_assets
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'r2',
  ADD COLUMN IF NOT EXISTS provider_asset_id text,
  ADD COLUMN IF NOT EXISTS provider_video_id text,
  ADD COLUMN IF NOT EXISTS provider_upload_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_processing_status text,
  ADD COLUMN IF NOT EXISTS provider_playback_url text,
  ADD COLUMN IF NOT EXISTS provider_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS provider_duration integer,
  ADD COLUMN IF NOT EXISTS provider_resolution text,
  ADD COLUMN IF NOT EXISTS provider_size bigint,
  ADD COLUMN IF NOT EXISTS provider_metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_capabilities jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_cost jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_last_sync timestamptz,
  ADD COLUMN IF NOT EXISTS provider_health text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS provider_error text,
  ADD COLUMN IF NOT EXISTS provider_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS provider_settings jsonb DEFAULT '{}'::jsonb;

-- Backfill provider from storage_provider for existing assets
UPDATE video_assets
SET provider = COALESCE(NULLIF(storage_provider, ''), 'r2')
WHERE provider = 'r2' AND storage_provider IS NOT NULL AND storage_provider <> 'r2';

CREATE INDEX IF NOT EXISTS idx_video_assets_provider ON video_assets(provider);
CREATE INDEX IF NOT EXISTS idx_video_assets_provider_video_id ON video_assets(provider_video_id);

-- Global default upload provider
INSERT INTO platform_settings (key, value)
VALUES ('default_video_upload_provider', 'vimeo')
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value)
VALUES ('preferred_video_upload_provider', 'vimeo')
ON CONFLICT (key) DO NOTHING;

-- Seed provider rows
INSERT INTO video_provider_settings (provider_id, enabled, is_primary, priority, status, region)
VALUES
  ('vimeo', true, true, 10, 'offline', 'global'),
  ('r2', true, false, 20, 'offline', 'auto')
ON CONFLICT (provider_id) DO NOTHING;

ALTER TABLE video_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health_logs ENABLE ROW LEVEL SECURITY;
