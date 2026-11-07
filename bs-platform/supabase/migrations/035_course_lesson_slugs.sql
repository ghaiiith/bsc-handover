-- Human-readable slugs for course player URLs (/learn/[courseSlug]/[lessonSlug]).

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS slug text;

-- Backfill from English titles; append short id suffix for uniqueness and non-Latin titles.
UPDATE public.courses c
SET slug = sub.candidate
FROM (
  SELECT
    id,
    (
      COALESCE(
        NULLIF(
          lower(
            regexp_replace(
              regexp_replace(trim(coalesce(title, '')), '[^a-zA-Z0-9]+', '-', 'g'),
              '(^-+|-+$)',
              '',
              'g'
            )
          ),
          ''
        ),
        'course'
      )
      || '-'
      || left(replace(id::text, '-', ''), 8)
    ) AS candidate
  FROM public.courses
  WHERE slug IS NULL
) sub
WHERE c.id = sub.id AND c.slug IS NULL;

UPDATE public.lessons l
SET slug = sub.candidate
FROM (
  SELECT
    id,
    (
      COALESCE(
        NULLIF(
          lower(
            regexp_replace(
              regexp_replace(trim(coalesce(title, '')), '[^a-zA-Z0-9]+', '-', 'g'),
              '(^-+|-+$)',
              '',
              'g'
            )
          ),
          ''
        ),
        'lesson'
      )
      || '-'
      || left(replace(id::text, '-', ''), 8)
    ) AS candidate
  FROM public.lessons
  WHERE slug IS NULL
) sub
WHERE l.id = sub.id AND l.slug IS NULL;

ALTER TABLE public.courses
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.lessons
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_slug
  ON public.courses (slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lessons_course_slug
  ON public.lessons (course_id, slug);
