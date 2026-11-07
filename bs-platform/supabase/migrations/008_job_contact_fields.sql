-- Job contact fields for external/contact-based applications
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_link text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS whatsapp_number text;
