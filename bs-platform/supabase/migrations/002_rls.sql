-- Business Skills Phase 1: Row Level Security
-- Run after 001_schema.sql in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_requests ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS policies
CREATE POLICY "users_read_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_public_read" ON users FOR SELECT USING (true);

-- COURSES policies
CREATE POLICY "courses_public_read_published" ON courses
  FOR SELECT USING (status = 'published');
CREATE POLICY "courses_instructor_manage_own" ON courses
  FOR ALL USING (instructor_id = auth.uid());
CREATE POLICY "courses_admin_all" ON courses
  FOR ALL USING (get_user_role() = 'admin');

-- LESSONS policies
CREATE POLICY "lessons_public_read_preview" ON lessons
  FOR SELECT USING (
    is_free_preview = true OR
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE student_id = auth.uid() AND course_id = lessons.course_id
    ) OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = lessons.course_id AND instructor_id = auth.uid()
    )
  );
CREATE POLICY "lessons_instructor_manage" ON lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = lessons.course_id AND instructor_id = auth.uid()
    )
  );

-- ENROLLMENTS policies
CREATE POLICY "enrollments_student_read_own" ON enrollments
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "enrollments_insert_authenticated" ON enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- LESSON_PROGRESS policies
CREATE POLICY "progress_student_manage_own" ON lesson_progress
  FOR ALL USING (student_id = auth.uid());

-- PAYMENTS policies
CREATE POLICY "payments_user_read_own" ON payments
  FOR SELECT USING (user_id = auth.uid());

-- JOBS policies
CREATE POLICY "jobs_public_read_active" ON jobs
  FOR SELECT USING (status = 'active');
CREATE POLICY "jobs_admin_all" ON jobs
  FOR ALL USING (get_user_role() = 'admin');

-- JOB_APPLICATIONS policies
CREATE POLICY "job_apps_applicant_manage_own" ON job_applications
  FOR ALL USING (applicant_id = auth.uid());
CREATE POLICY "job_apps_admin_read_all" ON job_applications
  FOR SELECT USING (get_user_role() = 'admin');

-- SERVICES policies
CREATE POLICY "services_public_read_active" ON services
  FOR SELECT USING (status = 'active');
CREATE POLICY "services_seller_manage_own" ON services
  FOR ALL USING (seller_id = auth.uid());

-- SERVICE_ORDERS policies
CREATE POLICY "orders_parties_read" ON service_orders
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY "orders_buyer_insert" ON service_orders
  FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "orders_seller_update_status" ON service_orders
  FOR UPDATE USING (seller_id = auth.uid());

-- REVIEWS policies
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_authenticated_insert" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- NOTIFICATIONS policies
CREATE POLICY "notifications_read_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- INSTRUCTOR_REQUESTS policies
CREATE POLICY "requests_user_read_own" ON instructor_requests
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "requests_user_insert" ON instructor_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "requests_admin_all" ON instructor_requests
  FOR ALL USING (get_user_role() = 'admin');
