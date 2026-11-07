-- Run after applying 034_service_list_pagination.sql
-- Usage (Supabase SQL editor or psql):
--   \i supabase/scripts/explain_get_active_services_page.sql

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.get_active_services_page(12, 1, 'newest', NULL, NULL, NULL, NULL, NULL);

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.get_active_services_page(12, 1, 'best_rated', NULL, NULL, NULL, NULL, NULL);

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.get_active_services_page(12, 1, 'most_orders', NULL, NULL, NULL, NULL, NULL);

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.get_active_services_page(12, 1, 'price_asc', NULL, NULL, NULL, NULL, NULL);

-- Category + search (trigram indexes from 031 should appear on OR ilike branches)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.get_active_services_page(12, 1, 'newest', 'design', NULL, NULL, NULL, 'logo');

-- Expected plan highlights:
--   * filtered: Index Scan or BitmapOr on idx_services_active_* / trigram GIN (search)
--   * totals: Aggregate on filtered rowset (no reviews/service_orders joins)
--   * ranked: Limit after sort using partial index matching p_sort when possible
--   * NO InitPlan / correlated subqueries per service row
--   * NO Seq Scan on service_orders
