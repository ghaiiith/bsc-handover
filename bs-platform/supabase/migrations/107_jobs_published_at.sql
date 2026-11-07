-- Round 9 (BS-109/110/111): the monthly job cap counts PUBLICATIONS, not
-- creations — a draft written this month and published next month belongs to
-- next month's allowance. Backfill from created_at for rows already live.
alter table jobs add column if not exists published_at timestamptz;
update jobs set published_at = coalesce(published_at, created_at)
 where status in ('active', 'expired', 'closed') and published_at is null;
create index if not exists jobs_poster_published_idx on jobs (posted_by, published_at desc) where posted_by is not null;
