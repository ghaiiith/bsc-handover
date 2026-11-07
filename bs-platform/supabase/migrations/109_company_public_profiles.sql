-- Round 9 (BS-102): public company profiles at a stable URL.
--
-- A company gets a slug derived from its name (unique, URL-safe) and a
-- switch to make the profile public. Only verified-or-unverified (not
-- blocked), active companies with a completed profile are ever served.

alter table users
  add column if not exists company_slug text,
  add column if not exists company_profile_public boolean not null default true;

create unique index if not exists users_company_slug_idx
  on users (company_slug) where company_slug is not null;

-- Slug generator: latin letters/digits/hyphens; Arabic names fall back to a
-- short id-based handle so the URL is always ASCII-stable.
create or replace function public.make_company_slug(p_name text, p_id uuid)
returns text language plpgsql as $$
declare
  base text;
begin
  base := lower(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from base);
  if length(base) < 3 then
    base := 'company-' || substr(replace(p_id::text, '-', ''), 1, 8);
  end if;
  return substr(base, 1, 60);
end $$;

-- Backfill existing companies; resolve collisions with a numeric suffix.
do $$
declare
  r record;
  candidate text;
  n int;
begin
  for r in select id, company_name, company_name_ar from users where role = 'company' and company_slug is null loop
    candidate := public.make_company_slug(coalesce(r.company_name, r.company_name_ar), r.id);
    n := 1;
    while exists (select 1 from users where company_slug = candidate) loop
      n := n + 1;
      candidate := public.make_company_slug(coalesce(r.company_name, r.company_name_ar), r.id) || '-' || n;
    end loop;
    update users set company_slug = candidate where id = r.id;
  end loop;
end $$;
