-- Buyers can read service details for services they have ordered (even if paused).
CREATE POLICY "services_buyer_read_ordered" ON public.services
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.service_orders
      WHERE service_orders.service_id = services.id
        AND service_orders.buyer_id = auth.uid()
    )
  );
