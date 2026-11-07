-- Business Skills Phase 1: Database Schema
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  full_name_ar text,
  avatar_url text,
  role text DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  bio text,
  bio_ar text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- INSTRUCTOR REQUESTS
CREATE TABLE instructor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text,
  admin_note text,
  created_at timestamptz DEFAULT now()
);

-- COURSES
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text NOT NULL,
  description text,
  description_ar text,
  thumbnail_url text,
  preview_video_url text,
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL,
  level text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  language text DEFAULT 'ar',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
  total_lessons int DEFAULT 0,
  total_duration_minutes int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- COURSE SECTIONS
CREATE TABLE course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text NOT NULL,
  order_index int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- LESSONS
CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES course_sections(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text NOT NULL,
  video_url text,
  duration_minutes int DEFAULT 0,
  order_index int NOT NULL,
  is_free_preview boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- PAYMENTS
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  course_id uuid REFERENCES courses(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'IQD',
  method text CHECK (method IN ('zaincash', 'qicard')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- ENROLLMENTS
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id),
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- LESSON PROGRESS
CREATE TABLE lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  UNIQUE(student_id, lesson_id)
);

-- JOBS
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id),
  title text NOT NULL,
  title_ar text NOT NULL,
  company_name text NOT NULL,
  city text NOT NULL,
  job_type text CHECK (job_type IN ('full_time', 'part_time', 'remote', 'internship')),
  salary_min numeric,
  salary_max numeric,
  currency text DEFAULT 'IQD',
  skills text[] DEFAULT '{}',
  description text NOT NULL,
  description_ar text NOT NULL,
  deadline date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
  created_at timestamptz DEFAULT now()
);

-- JOB APPLICATIONS
CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES users(id) ON DELETE CASCADE,
  cv_url text NOT NULL,
  cover_letter text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  applied_at timestamptz DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- SERVICES
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text NOT NULL,
  description text NOT NULL,
  description_ar text NOT NULL,
  price numeric NOT NULL,
  delivery_days int NOT NULL,
  category text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  created_at timestamptz DEFAULT now()
);

-- SERVICE ORDERS
CREATE TABLE service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id),
  buyer_id uuid REFERENCES users(id),
  seller_id uuid REFERENCES users(id),
  payment_id uuid REFERENCES payments(id),
  requirements text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delivered', 'completed', 'cancelled')),
  ordered_at timestamptz DEFAULT now()
);

-- REVIEWS
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  target_type text CHECK (target_type IN ('course', 'service')),
  target_id uuid NOT NULL,
  rating int CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reviewer_id, target_type, target_id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text NOT NULL,
  body text NOT NULL,
  body_ar text NOT NULL,
  type text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- INDEXES for performance
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- TRIGGER: auto-create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- TRIGGER: update courses.updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
