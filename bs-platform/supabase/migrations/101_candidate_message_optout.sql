-- Report BS-82: a candidate can opt out of receiving messages from companies.
-- Default true so existing candidates remain reachable by subscribed employers.
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_messages boolean DEFAULT true;
