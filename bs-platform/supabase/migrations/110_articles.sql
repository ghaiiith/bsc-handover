-- Round 9 (BS-105): administrator-managed articles.
--
-- Editorial content with a stable public URL (/[locale]/articles/[slug]).
-- Admins create, edit, publish and unpublish; the public reads only what is
-- published. Bilingual fields mirror the rest of the platform.

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  title_ar text,
  summary text,
  summary_ar text,
  body text not null default '',
  body_ar text,
  cover_image_url text,
  author_id uuid references users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_published_idx on articles (status, published_at desc);

alter table articles enable row level security;

drop policy if exists articles_public_read on articles;
create policy articles_public_read on articles for select
  using (status = 'published');

drop policy if exists articles_admin_all on articles;
create policy articles_admin_all on articles for all
  using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

grant select on articles to anon, authenticated;
grant insert, update, delete on articles to authenticated;
