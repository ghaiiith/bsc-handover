CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active)
WHERE is_active = true;
