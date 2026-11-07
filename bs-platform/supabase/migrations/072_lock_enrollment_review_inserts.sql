-- ============================================================================
-- 072_lock_enrollment_review_inserts.sql
-- SECURITY: the app ships a public anon-key browser client, so a permissive
-- INSERT policy is a real trust boundary. Two policies let an authenticated
-- user forge rows directly via PostgREST, bypassing all server-side checks:
--
--   * enrollments_insert_authenticated (WITH CHECK student_id = auth.uid())
--       → self-enroll in any PAID course with no payment (CRITICAL).
--   * reviews_authenticated_insert (WITH CHECK reviewer_id = auth.uid())
--       → fake / self reviews with no purchase.
--
-- Both are now created ONLY through the validated server actions using the
-- service-role client (which bypasses RLS). Removing the authenticated INSERT
-- policy makes RLS default-deny direct inserts for anon/authenticated.
-- ============================================================================

drop policy if exists "enrollments_insert_authenticated" on public.enrollments;
drop policy if exists "reviews_authenticated_insert" on public.reviews;
