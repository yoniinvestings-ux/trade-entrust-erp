-- Fix remaining tables - drop existing policies first

-- =====================================================
-- 2. ACTIVITY_LOGS TABLE - Restrict to privileged users
-- =====================================================
DROP POLICY IF EXISTS "Privileged users can view activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity_logs" ON public.activity_logs;

CREATE POLICY "Privileged users can view activity_logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (is_privileged_user(auth.uid()));

CREATE POLICY "Authenticated users can insert activity_logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 3. ORDER_MILESTONES TABLE - Based on order access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view order_milestones" ON public.order_milestones;
DROP POLICY IF EXISTS "Authenticated users can insert order_milestones" ON public.order_milestones;
DROP POLICY IF EXISTS "Authenticated users can update order_milestones" ON public.order_milestones;
DROP POLICY IF EXISTS "Authenticated users can delete order_milestones" ON public.order_milestones;
DROP POLICY IF EXISTS "Users with order access can view order_milestones" ON public.order_milestones;
DROP POLICY IF EXISTS "Users with order access can insert order_milestones" ON public.order_milestones;
DROP POLICY IF EXISTS "Users with order access can update order_milestones" ON public.order_milestones;
DROP POLICY IF EXISTS "Privileged users can delete order_milestones" ON public.order_milestones;

CREATE POLICY "Users with order access can view order_milestones"
  ON public.order_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_milestones.order_id
      AND (
        auth.uid() = ANY(orders.assigned_team)
        OR is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sales')
        OR has_role(auth.uid(), 'sourcing')
        OR has_role(auth.uid(), 'production')
      )
    )
  );

CREATE POLICY "Users with order access can insert order_milestones"
  ON public.order_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_milestones.order_id
      AND (
        auth.uid() = ANY(orders.assigned_team)
        OR is_privileged_user(auth.uid())
      )
    )
  );

CREATE POLICY "Users with order access can update order_milestones"
  ON public.order_milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_milestones.order_id
      AND (
        auth.uid() = ANY(orders.assigned_team)
        OR is_privileged_user(auth.uid())
      )
    )
  );

CREATE POLICY "Privileged users can delete order_milestones"
  ON public.order_milestones FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 4. GENERATED_DOCUMENTS TABLE - Based on order/PO access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view generated_documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Authenticated users can insert generated_documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Authenticated users can update generated_documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Authenticated users can delete generated_documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Authorized users can view generated_documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Authorized users can insert generated_documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Users can update their documents" ON public.generated_documents;
DROP POLICY IF EXISTS "Privileged users can delete generated_documents" ON public.generated_documents;

CREATE POLICY "Authorized users can view generated_documents"
  ON public.generated_documents FOR SELECT
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'finance')
    OR has_role(auth.uid(), 'logistics')
    OR generated_by = auth.uid()
  );

CREATE POLICY "Authorized users can insert generated_documents"
  ON public.generated_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'finance')
  );

CREATE POLICY "Users can update their documents"
  ON public.generated_documents FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR generated_by = auth.uid()
  );

CREATE POLICY "Privileged users can delete generated_documents"
  ON public.generated_documents FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 5. PROJECT_FILES TABLE - Based on project/order access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view project_files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can insert project_files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can update project_files" ON public.project_files;
DROP POLICY IF EXISTS "Authenticated users can delete project_files" ON public.project_files;
DROP POLICY IF EXISTS "Authorized users can view project_files" ON public.project_files;
DROP POLICY IF EXISTS "Authorized users can insert project_files" ON public.project_files;
DROP POLICY IF EXISTS "Users can update their files" ON public.project_files;
DROP POLICY IF EXISTS "Privileged users can delete project_files" ON public.project_files;

CREATE POLICY "Authorized users can view project_files"
  ON public.project_files FOR SELECT
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'merchandising')
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "Authorized users can insert project_files"
  ON public.project_files FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'merchandising')
  );

CREATE POLICY "Users can update their files"
  ON public.project_files FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "Privileged users can delete project_files"
  ON public.project_files FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 6. TIME_ENTRIES TABLE - Own entries only
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Authenticated users can insert time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Authenticated users can update time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Authenticated users can delete time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view own or privileged view all time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert own time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update own time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete own time_entries" ON public.time_entries;

CREATE POLICY "Users can view own or privileged view all time_entries"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Users can insert own time_entries"
  ON public.time_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time_entries"
  ON public.time_entries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_privileged_user(auth.uid()));

CREATE POLICY "Users can delete own time_entries"
  ON public.time_entries FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR is_privileged_user(auth.uid()));

-- =====================================================
-- 7. SHIPMENT_ITEMS TABLE - Based on shipment access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view shipment_items" ON public.shipment_items;
DROP POLICY IF EXISTS "Authenticated users can insert shipment_items" ON public.shipment_items;
DROP POLICY IF EXISTS "Authenticated users can update shipment_items" ON public.shipment_items;
DROP POLICY IF EXISTS "Authenticated users can delete shipment_items" ON public.shipment_items;
DROP POLICY IF EXISTS "Authorized users can view shipment_items" ON public.shipment_items;
DROP POLICY IF EXISTS "Logistics can insert shipment_items" ON public.shipment_items;
DROP POLICY IF EXISTS "Logistics can update shipment_items" ON public.shipment_items;
DROP POLICY IF EXISTS "Privileged users can delete shipment_items" ON public.shipment_items;

CREATE POLICY "Authorized users can view shipment_items"
  ON public.shipment_items FOR SELECT
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'logistics')
    OR has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Logistics can insert shipment_items"
  ON public.shipment_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'logistics')
  );

CREATE POLICY "Logistics can update shipment_items"
  ON public.shipment_items FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'logistics')
  );

CREATE POLICY "Privileged users can delete shipment_items"
  ON public.shipment_items FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 8. SHIPMENT_ORDERS TABLE - Based on shipment access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view shipment_orders" ON public.shipment_orders;
DROP POLICY IF EXISTS "Authenticated users can insert shipment_orders" ON public.shipment_orders;
DROP POLICY IF EXISTS "Authenticated users can update shipment_orders" ON public.shipment_orders;
DROP POLICY IF EXISTS "Authenticated users can delete shipment_orders" ON public.shipment_orders;
DROP POLICY IF EXISTS "Authorized users can view shipment_orders" ON public.shipment_orders;
DROP POLICY IF EXISTS "Logistics can insert shipment_orders" ON public.shipment_orders;
DROP POLICY IF EXISTS "Logistics can update shipment_orders" ON public.shipment_orders;
DROP POLICY IF EXISTS "Privileged users can delete shipment_orders" ON public.shipment_orders;

CREATE POLICY "Authorized users can view shipment_orders"
  ON public.shipment_orders FOR SELECT
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'logistics')
    OR has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Logistics can insert shipment_orders"
  ON public.shipment_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'logistics')
  );

CREATE POLICY "Logistics can update shipment_orders"
  ON public.shipment_orders FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'logistics')
  );

CREATE POLICY "Privileged users can delete shipment_orders"
  ON public.shipment_orders FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 9. Fix functions with mutable search_path
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  today_date TEXT;
  seq_num INTEGER;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 13) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.purchase_orders
  WHERE po_number LIKE 'PO-' || today_date || '-%';
  RETURN 'PO-' || today_date || '-' || LPAD(seq_num::TEXT, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  today_date TEXT;
  seq_num INTEGER;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 14) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.orders
  WHERE order_number LIKE 'ORD-' || today_date || '-%';
  RETURN 'ORD-' || today_date || '-' || LPAD(seq_num::TEXT, 4, '0');
END;
$function$;