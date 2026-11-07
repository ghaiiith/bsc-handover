-- 080_service_portfolio_items.sql
-- Report BS-22: make the service portfolio generic — each entry supports a title,
-- a description, one or more links (live site / repo / video) and optional images,
-- instead of only a flat list of images.
--
-- Shape of each element in the jsonb array:
--   { "title": text, "description": text, "links": [text], "images": [text] }
-- The legacy `portfolio_images text[]` column is kept for backward compatibility
-- (existing services still render their images).

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS portfolio_items jsonb NOT NULL DEFAULT '[]'::jsonb;
