-- Round 9 (BS-102) follow-up: the backfill in 109 only covered rows that
-- existed at migration time. New companies — and companies that only fill in
-- their name later — must get a slug the moment a name exists, without any
-- application code having to remember to do it.
create or replace function public.ensure_company_slug()
returns trigger language plpgsql as $$
declare
  candidate text;
  n int := 1;
begin
  if new.role <> 'company' then return new; end if;
  if new.company_slug is not null and new.company_slug <> '' then return new; end if;
  if coalesce(new.company_name, new.company_name_ar) is null then return new; end if;

  candidate := public.make_company_slug(coalesce(new.company_name, new.company_name_ar), new.id);
  while exists (select 1 from users where company_slug = candidate and id <> new.id) loop
    n := n + 1;
    candidate := public.make_company_slug(coalesce(new.company_name, new.company_name_ar), new.id) || '-' || n;
  end loop;
  new.company_slug := candidate;
  return new;
end $$;

drop trigger if exists users_ensure_company_slug on users;
create trigger users_ensure_company_slug
  before insert or update of role, company_name, company_name_ar on users
  for each row execute function public.ensure_company_slug();
