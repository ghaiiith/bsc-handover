-- ============================================================================
-- 071_wayl_payment_method.sql
-- Add 'wayl' (thewayl.com aggregator — cards, wallets, Qi) as a payment method.
-- Widens the payments.method CHECK constraint added in 001_schema.sql.
-- ============================================================================

alter table public.payments
  drop constraint if exists payments_method_check;

alter table public.payments
  add constraint payments_method_check
  check (method in ('zaincash', 'qicard', 'wayl', 'virtual'));
