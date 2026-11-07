-- Add rejection reason for admin course moderation
ALTER TABLE courses ADD COLUMN IF NOT EXISTS rejection_reason text;
