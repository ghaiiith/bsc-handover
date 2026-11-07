-- 031_perf_indexes.sql
-- Perf: add indexes for the hot query paths identified in the audit. Index-only
-- change (no app/schema changes), safe to apply.
--
-- NOTE: on large/busy tables, prefer running each CREATE INDEX with CONCURRENTLY
-- (outside a transaction) to avoid write locks. The statements below use plain
-- CREATE INDEX IF NOT EXISTS for simplicity; current table sizes make this fine.

-- ---------------------------------------------------------------------------
-- 1) Composite (status, created_at DESC) for the public listing queries, which
--    filter by status then order by created_at. Serves both the equality filter
--    and the sort from a single index.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_courses_status_created
  ON courses (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_services_status_created
  ON services (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_status_created
  ON jobs (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2) jobs.skills is queried with `contains` (array @> []). GIN accelerates it.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING gin (skills);

-- ---------------------------------------------------------------------------
-- 3) Trigram GIN indexes for case-insensitive substring search (ILIKE '%term%').
--    These leading-wildcard patterns cannot use btree. Every column referenced
--    in a given .or(...) search needs an index, otherwise the planner falls back
--    to a sequential scan for the whole OR.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Admin user search: full_name / full_name_ar / email
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm
  ON users USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_full_name_ar_trgm
  ON users USING gin (full_name_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm
  ON users USING gin (email gin_trgm_ops);

-- Course search: title / title_ar
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm
  ON courses USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_courses_title_ar_trgm
  ON courses USING gin (title_ar gin_trgm_ops);

-- Service search: title / title_ar / description / description_ar
CREATE INDEX IF NOT EXISTS idx_services_title_trgm
  ON services USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_services_title_ar_trgm
  ON services USING gin (title_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_services_description_trgm
  ON services USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_services_description_ar_trgm
  ON services USING gin (description_ar gin_trgm_ops);

-- Job search: title / title_ar / company_name / description / description_ar
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm
  ON jobs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_title_ar_trgm
  ON jobs USING gin (title_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_company_name_trgm
  ON jobs USING gin (company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_description_trgm
  ON jobs USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_description_ar_trgm
  ON jobs USING gin (description_ar gin_trgm_ops);
