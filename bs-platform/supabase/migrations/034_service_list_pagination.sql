-- 034_service_list_pagination.sql
--
-- Public /services listing: denormalized aggregates + paginated RPC.
--
-- Performance:
--   * avg_rating, review_count, order_count live on services (maintained by triggers)
--   * get_active_services_page reads only services + users (no per-row subqueries)
--   * partial indexes for active-listing sort/filter paths (complements 031 trigram)
--
-- Security:
--   * Listing RPC is SECURITY INVOKER — caller RLS applies; no service_orders exposure
--   * Trigger helpers are SECURITY DEFINER — only bump aggregate counters on services
--   * EXECUTE on listing RPC granted to anon/authenticated/service_role only (not PUBLIC)

-- ---------------------------------------------------------------------------
-- 1) Denormalized aggregate columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS avg_rating numeric(4, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.services.avg_rating IS
  'Denormalized AVG(reviews.rating) for target_type=service; maintained by trigger.';
COMMENT ON COLUMN public.services.review_count IS
  'Denormalized COUNT(reviews) for target_type=service; maintained by trigger.';
COMMENT ON COLUMN public.services.order_count IS
  'Denormalized COUNT(service_orders); maintained by trigger; count only, no order rows exposed.';

-- One-time backfill (single grouped scan per source table, not per service row).
UPDATE public.services s
SET
  review_count = COALESCE(r.cnt, 0),
  avg_rating = COALESCE(r.avg_rating, 0)
FROM (
  SELECT
    target_id AS service_id,
    COUNT(*)::integer AS cnt,
    COALESCE(AVG(rating)::numeric(4, 2), 0) AS avg_rating
  FROM public.reviews
  WHERE target_type = 'service'
  GROUP BY target_id
) r
WHERE s.id = r.service_id;

UPDATE public.services s
SET order_count = COALESCE(o.cnt, 0)
FROM (
  SELECT service_id, COUNT(*)::integer AS cnt
  FROM public.service_orders
  WHERE service_id IS NOT NULL
  GROUP BY service_id
) o
WHERE s.id = o.service_id;

-- ---------------------------------------------------------------------------
-- 2) Trigger helpers (SECURITY DEFINER — write aggregates only, no row leakage)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_service_review_stats(p_service_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.services s
  SET
    review_count = COALESCE(stats.cnt, 0),
    avg_rating = COALESCE(stats.avg_rating, 0)
  FROM (
    SELECT
      COUNT(*)::integer AS cnt,
      COALESCE(AVG(rating)::numeric(4, 2), 0) AS avg_rating
    FROM public.reviews
    WHERE target_type = 'service'
      AND target_id = p_service_id
  ) stats
  WHERE s.id = p_service_id;
$$;

CREATE OR REPLACE FUNCTION public.trg_reviews_service_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_type = 'service' THEN
    PERFORM public.refresh_service_review_stats(NEW.target_id);
  ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'service' THEN
    PERFORM public.refresh_service_review_stats(OLD.target_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.target_type = 'service' AND (
      OLD.target_id IS DISTINCT FROM NEW.target_id
      OR OLD.target_type IS DISTINCT FROM NEW.target_type
      OR OLD.rating IS DISTINCT FROM NEW.rating
    ) THEN
      PERFORM public.refresh_service_review_stats(OLD.target_id);
    END IF;
    IF NEW.target_type = 'service' THEN
      PERFORM public.refresh_service_review_stats(NEW.target_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_service_stats ON public.reviews;
CREATE TRIGGER reviews_service_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_reviews_service_stats();

CREATE OR REPLACE FUNCTION public.trg_service_orders_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.service_id IS NOT NULL THEN
    UPDATE public.services
    SET order_count = order_count + 1
    WHERE id = NEW.service_id;
  ELSIF TG_OP = 'DELETE' AND OLD.service_id IS NOT NULL THEN
    UPDATE public.services
    SET order_count = GREATEST(order_count - 1, 0)
    WHERE id = OLD.service_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS service_orders_count ON public.service_orders;
CREATE TRIGGER service_orders_count
  AFTER INSERT OR DELETE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_service_orders_count();

REVOKE ALL ON FUNCTION public.refresh_service_review_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_reviews_service_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_service_orders_count() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 3) Partial indexes for active listing sorts (status = 'active' only)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_services_active_created
  ON public.services (created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_services_active_price
  ON public.services (price ASC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_services_active_avg_rating
  ON public.services (avg_rating DESC, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_services_active_order_count
  ON public.services (order_count DESC, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_services_active_category_created
  ON public.services (category, created_at DESC)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- 4) Paginated listing RPC (SECURITY INVOKER — RLS-enforced, no definer bypass)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_services_page(
  p_page_size int DEFAULT 12,
  p_page int DEFAULT 1,
  p_sort text DEFAULT 'newest',
  p_category text DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_delivery_max int DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      s.id,
      s.seller_id,
      s.title,
      s.title_ar,
      s.description,
      s.description_ar,
      s.price,
      s.delivery_days,
      s.category,
      s.status,
      s.portfolio_images,
      s.created_at,
      s.updated_at,
      u.id AS seller_user_id,
      u.full_name AS seller_full_name,
      u.full_name_ar AS seller_full_name_ar,
      u.avatar_url AS seller_avatar_url,
      s.avg_rating::float8 AS calc_avg_rating,
      s.review_count::bigint AS calc_review_count,
      s.order_count::bigint AS calc_order_count
    FROM public.services s
    LEFT JOIN public.users u ON u.id = s.seller_id
    WHERE s.status = 'active'
      AND (p_category IS NULL OR s.category = p_category)
      AND (p_price_min IS NULL OR s.price >= p_price_min)
      AND (p_price_max IS NULL OR s.price <= p_price_max)
      AND (p_delivery_max IS NULL OR s.delivery_days <= p_delivery_max)
      AND (
        p_search IS NULL OR p_search = '' OR
        s.title ILIKE '%' || p_search || '%' OR
        s.title_ar ILIKE '%' || p_search || '%' OR
        s.description ILIKE '%' || p_search || '%' OR
        s.description_ar ILIKE '%' || p_search || '%'
      )
  ),
  totals AS (
    SELECT COUNT(*)::bigint AS cnt FROM filtered
  ),
  ranked AS (
    SELECT f.*
    FROM filtered f
    ORDER BY
      CASE WHEN p_sort = 'price_asc' THEN f.price END ASC NULLS LAST,
      CASE WHEN p_sort = 'price_desc' THEN f.price END DESC NULLS LAST,
      CASE WHEN p_sort = 'best_rated' THEN f.calc_avg_rating END DESC NULLS LAST,
      CASE WHEN p_sort = 'most_orders' THEN f.calc_order_count END DESC NULLS LAST,
      f.created_at DESC
    OFFSET GREATEST(p_page - 1, 0) * GREATEST(p_page_size, 1)
    LIMIT GREATEST(p_page_size, 1)
  )
  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM totals),
    'rows', COALESCE((SELECT jsonb_agg(row_to_json(r)) FROM ranked r), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_active_services_page(
  int, int, text, text, numeric, numeric, int, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_active_services_page(
  int, int, text, text, numeric, numeric, int, text
) TO anon, authenticated, service_role;
