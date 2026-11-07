-- Payment indexes and RLS policies for Phase 3

ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_transaction_id text;

CREATE INDEX IF NOT EXISTS idx_payments_reference_id ON payments(reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_course ON payments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE POLICY "payments_user_insert_own" ON payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_instructor_read" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = payments.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "payments_admin_all" ON payments
  FOR ALL USING (get_user_role() = 'admin');
