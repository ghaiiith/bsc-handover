-- Report BS-28: indexes for the queries behind the listing pages, plus the two
-- hottest polling tables. Measured with pg_stat_user_tables / pg_stat_statements
-- on production before adding these.

-- Courses listing: published courses ordered by recency, often filtered by
-- category or instructor.
CREATE INDEX IF NOT EXISTS idx_courses_status_created
  ON public.courses (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_category_status
  ON public.courses (category, status);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_status
  ON public.courses (instructor_id, status);

-- Jobs listing: active jobs newest-first; company dashboard filters by poster.
CREATE INDEX IF NOT EXISTS idx_jobs_status_created
  ON public.jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by_status
  ON public.jobs (posted_by, status);

-- Services marketplace.
CREATE INDEX IF NOT EXISTS idx_services_status_created
  ON public.services (status, created_at DESC);

-- Curriculum: every lesson page walks sections → lessons in order.
CREATE INDEX IF NOT EXISTS idx_course_sections_course_order
  ON public.course_sections (course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_course_order
  ON public.lessons (course_id, order_index);

-- 45k sequential scans on six rows: the video-processing worker polls this
-- table constantly.
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_status
  ON public.video_processing_jobs (status, created_at);

-- Category filter chips on the courses page.
CREATE INDEX IF NOT EXISTS idx_course_categories_active
  ON public.course_categories (is_active, sort_order);
