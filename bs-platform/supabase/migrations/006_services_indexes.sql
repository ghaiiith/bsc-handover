-- Services marketplace indexes and schema additions

ALTER TABLE services ADD COLUMN IF NOT EXISTS portfolio_images text[] DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS service_order_id uuid REFERENCES service_orders(id);

CREATE INDEX IF NOT EXISTS idx_services_seller_id ON services(seller_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_buyer ON service_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_seller ON service_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_type, target_id);

CREATE POLICY "orders_buyer_update_own" ON service_orders
  FOR UPDATE USING (buyer_id = auth.uid());
