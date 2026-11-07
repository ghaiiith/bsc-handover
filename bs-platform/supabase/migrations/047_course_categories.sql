-- Feature: Admin-managed course categories
-- Moves course categories from a hardcoded constant to a DB table the admin can
-- edit (rename/add/deactivate). The `value` slug is immutable once created so
-- existing courses.category references stay valid.

CREATE TABLE IF NOT EXISTS course_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Slug guard: lowercase letters, digits, underscore, hyphen.
ALTER TABLE course_categories
  DROP CONSTRAINT IF EXISTS chk_course_category_value;
ALTER TABLE course_categories
  ADD CONSTRAINT chk_course_category_value CHECK (value ~ '^[a-z0-9_-]+$');

-- Seed with the previously hardcoded categories (idempotent).
INSERT INTO course_categories (value, label_ar, label_en, sort_order) VALUES
  ('programming', 'البرمجة', 'Programming', 1),
  ('design', 'التصميم', 'Design', 2),
  ('marketing', 'التسويق', 'Marketing', 3),
  ('business', 'الأعمال', 'Business', 4),
  ('language', 'اللغات', 'Languages', 5),
  ('video', 'الفيديو والصوت', 'Video & Audio', 6),
  ('data', 'البيانات والذكاء الاصطناعي', 'Data & AI', 7),
  ('other', 'أخرى', 'Other', 8)
ON CONFLICT (value) DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;

-- Categories are public reference data.
DROP POLICY IF EXISTS "course_categories_read" ON course_categories;
CREATE POLICY "course_categories_read" ON course_categories
  FOR SELECT USING (true);

-- Only admins may create/update/deactivate. (The server actions use the
-- service-role client which bypasses RLS, but this protects direct access.)
DROP POLICY IF EXISTS "course_categories_admin_all" ON course_categories;
CREATE POLICY "course_categories_admin_all" ON course_categories
  FOR ALL USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
