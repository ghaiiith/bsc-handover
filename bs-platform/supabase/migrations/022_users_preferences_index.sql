CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin(preferences);
