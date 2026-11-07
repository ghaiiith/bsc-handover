-- ============================================================================
-- 070_video_processing_jobs.sql
-- Online video processing queue: a raw upload (courses/{courseId}/{slot}/source/
-- video.mp4) is transcoded server-side into an adaptive HLS ladder
-- (courses/{courseId}/{slot}/hls/master.m3u8 + renditions) by a standalone
-- worker. This table is the durable job queue; the worker claims jobs atomically
-- via claim_next_video_job(). Playback lights up automatically once master.m3u8
-- lands in R2 (see isLessonHlsReady) — no extra flag needed for delivery.
-- ============================================================================

create table if not exists public.video_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.video_assets(id) on delete cascade,
  course_id uuid not null,
  -- lesson id, or the literal 'preview' for a course trailer (mirrors VideoSlot).
  lesson_slot text not null,
  source_key text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'canceled')),
  -- 0..100 overall percentage for the UI progress bar.
  progress int not null default 0 check (progress between 0 and 100),
  -- coarse stage label: analyzing | transcoding | uploading | finalizing
  stage text,
  error text,
  -- [{ height, bitrateKbps, width }] once known.
  renditions jsonb not null default '[]'::jsonb,
  master_key text,
  poster_key text,
  duration_seconds int,
  attempts int not null default 0,
  -- worker heartbeat so a crashed job can be reclaimed.
  heartbeat_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists idx_video_jobs_queued
  on public.video_processing_jobs (created_at)
  where status = 'queued';

create index if not exists idx_video_jobs_asset
  on public.video_processing_jobs (asset_id);

create index if not exists idx_video_jobs_course_slot
  on public.video_processing_jobs (course_id, lesson_slot);

alter table public.video_processing_jobs enable row level security;

-- Service-role (the worker + server actions) does everything; RLS is bypassed
-- for it. Authenticated users may only READ their own jobs (status polling).
revoke all on public.video_processing_jobs from anon, authenticated;
grant select on public.video_processing_jobs to authenticated;

drop policy if exists video_jobs_owner_read on public.video_processing_jobs;
create policy video_jobs_owner_read
  on public.video_processing_jobs
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.get_user_role() = 'admin'
  );

-- ── Atomic claim: one worker grabs the oldest queued (or stale-processing) job.
-- SECURITY DEFINER + pinned search_path so it runs with table owner rights and
-- cannot be search_path-hijacked (mirrors migration 063 hardening).
create or replace function public.claim_next_video_job(p_stale_seconds int default 900)
returns public.video_processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed public.video_processing_jobs;
begin
  select *
    into claimed
    from public.video_processing_jobs
   where status = 'queued'
      or (status = 'processing'
          and heartbeat_at is not null
          and heartbeat_at < now() - make_interval(secs => p_stale_seconds))
   order by created_at
   for update skip locked
   limit 1;

  if claimed.id is null then
    return null;
  end if;

  update public.video_processing_jobs
     set status = 'processing',
         attempts = attempts + 1,
         stage = 'analyzing',
         progress = case when status = 'queued' then 0 else progress end,
         started_at = coalesce(started_at, now()),
         heartbeat_at = now(),
         updated_at = now()
   where id = claimed.id
   returning * into claimed;

  return claimed;
end;
$$;

revoke all on function public.claim_next_video_job(int) from public;
-- Only the service role (worker) may claim jobs.
grant execute on function public.claim_next_video_job(int) to service_role;
