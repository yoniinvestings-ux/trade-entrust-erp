-- =====================================================
-- COMPREHENSIVE RLS SECURITY FIX
-- =====================================================

-- 1. Fix customer_ledger and employee_workload views (missing security_invoker)
ALTER VIEW public.customer_ledger SET (security_invoker = on);
ALTER VIEW public.employee_workload SET (security_invoker = on);

-- =====================================================
-- 2. CUSTOMERS TABLE - Team-based access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

CREATE POLICY "Team members can view customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team) 
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'finance')
  );

CREATE POLICY "Privileged users can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Team members can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team) 
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Privileged users can delete customers"
  ON public.customers FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 3. ORDERS TABLE - Team-based access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;

CREATE POLICY "Team members can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team) 
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'qc')
    OR has_role(auth.uid(), 'logistics')
    OR has_role(auth.uid(), 'finance')
    OR has_role(auth.uid(), 'production')
    OR has_role(auth.uid(), 'merchandising')
  );

CREATE POLICY "Authorized users can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'sourcing')
  );

CREATE POLICY "Team members can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team) 
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'qc')
    OR has_role(auth.uid(), 'logistics')
    OR has_role(auth.uid(), 'production')
    OR has_role(auth.uid(), 'merchandising')
  );

CREATE POLICY "Privileged users can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 4. ORDER_ITEMS TABLE - Based on order access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can delete order_items" ON public.order_items;

CREATE POLICY "Users with order access can view order_items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id
      AND (
        auth.uid() = ANY(orders.assigned_team)
        OR is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sales')
        OR has_role(auth.uid(), 'sourcing')
        OR has_role(auth.uid(), 'qc')
        OR has_role(auth.uid(), 'logistics')
        OR has_role(auth.uid(), 'production')
        OR has_role(auth.uid(), 'merchandising')
      )
    )
  );

CREATE POLICY "Users with order access can insert order_items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id
      AND (
        auth.uid() = ANY(orders.assigned_team)
        OR is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sales')
        OR has_role(auth.uid(), 'sourcing')
      )
    )
  );

CREATE POLICY "Users with order access can update order_items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id
      AND (
        auth.uid() = ANY(orders.assigned_team)
        OR is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sales')
        OR has_role(auth.uid(), 'sourcing')
      )
    )
  );

CREATE POLICY "Privileged users can delete order_items"
  ON public.order_items FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 5. SUPPLIERS TABLE - Team-based access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON public.suppliers;

CREATE POLICY "Authorized users can view suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team)
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'qc')
    OR has_role(auth.uid(), 'finance')
    OR has_role(auth.uid(), 'production')
  );

CREATE POLICY "Sourcing can insert suppliers"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
  );

CREATE POLICY "Team members can update suppliers"
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team)
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
  );

CREATE POLICY "Privileged users can delete suppliers"
  ON public.suppliers FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 6. PURCHASE_ORDERS TABLE - Based on order access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can insert purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can update purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can delete purchase_orders" ON public.purchase_orders;

CREATE POLICY "Authorized users can view purchase_orders"
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = purchase_orders.order_id
      AND (
        auth.uid() = ANY(orders.assigned_team)
        OR is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sourcing')
        OR has_role(auth.uid(), 'merchandising')
        OR has_role(auth.uid(), 'qc')
        OR has_role(auth.uid(), 'logistics')
        OR has_role(auth.uid(), 'finance')
        OR has_role(auth.uid(), 'production')
      )
    )
  );

CREATE POLICY "Merchandising can insert purchase_orders"
  ON public.purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'sourcing')
  );

CREATE POLICY "Authorized users can update purchase_orders"
  ON public.purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = purchase_orders.order_id
      AND (
        auth.uid() = ANY(orders.assigned_team)
        OR is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sourcing')
        OR has_role(auth.uid(), 'merchandising')
        OR has_role(auth.uid(), 'qc')
        OR has_role(auth.uid(), 'production')
        OR has_role(auth.uid(), 'finance')
      )
    )
  );

CREATE POLICY "Privileged users can delete purchase_orders"
  ON public.purchase_orders FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 7. LEADS TABLE - Sales/Marketing access only
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;

CREATE POLICY "Sales and marketing can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'marketing')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Sales and marketing can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'marketing')
  );

CREATE POLICY "Sales and marketing can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'marketing')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Privileged users can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 8. QUOTATIONS TABLE - Sales access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can update quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can delete quotations" ON public.quotations;

CREATE POLICY "Authorized users can view quotations"
  ON public.quotations FOR SELECT
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'sourcing')
    OR created_by = auth.uid()
  );

CREATE POLICY "Sales can insert quotations"
  ON public.quotations FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'sourcing')
  );

CREATE POLICY "Sales can update quotations"
  ON public.quotations FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'sourcing')
    OR created_by = auth.uid()
  );

CREATE POLICY "Privileged users can delete quotations"
  ON public.quotations FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 9. QUOTATION_ITEMS TABLE - Based on quotation access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "Authenticated users can insert quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "Authenticated users can update quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "Authenticated users can delete quotation_items" ON public.quotation_items;

CREATE POLICY "Users with quotation access can view quotation_items"
  ON public.quotation_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations 
      WHERE quotations.id = quotation_items.quotation_id
      AND (
        is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sales')
        OR has_role(auth.uid(), 'sourcing')
        OR quotations.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users with quotation access can insert quotation_items"
  ON public.quotation_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations 
      WHERE quotations.id = quotation_items.quotation_id
      AND (
        is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sales')
        OR has_role(auth.uid(), 'sourcing')
      )
    )
  );

CREATE POLICY "Users with quotation access can update quotation_items"
  ON public.quotation_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations 
      WHERE quotations.id = quotation_items.quotation_id
      AND (
        is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sales')
        OR has_role(auth.uid(), 'sourcing')
      )
    )
  );

CREATE POLICY "Privileged users can delete quotation_items"
  ON public.quotation_items FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 10. SHIPMENTS TABLE - Logistics access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view shipments" ON public.shipments;
DROP POLICY IF EXISTS "Authenticated users can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Authenticated users can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Authenticated users can delete shipments" ON public.shipments;

CREATE POLICY "Authorized users can view shipments"
  ON public.shipments FOR SELECT
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'logistics')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'finance')
    OR EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = shipments.order_id
      AND auth.uid() = ANY(orders.assigned_team)
    )
  );

CREATE POLICY "Logistics can insert shipments"
  ON public.shipments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'logistics')
  );

CREATE POLICY "Logistics can update shipments"
  ON public.shipments FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'logistics')
  );

CREATE POLICY "Privileged users can delete shipments"
  ON public.shipments FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 11. FINANCIAL_RECORDS TABLE - Fix INSERT policy
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can insert financial_records" ON public.financial_records;

CREATE POLICY "Finance users can insert financial_records"
  ON public.financial_records FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'finance')
  );

-- =====================================================
-- 12. COMPANY_SETTINGS TABLE - Privileged access only
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can insert company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can update company_settings" ON public.company_settings;

-- Allow all authenticated users to view basic company info (needed for documents)
-- But banking details should be handled in the application layer
CREATE POLICY "Authenticated users can view company_settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Privileged users can insert company_settings"
  ON public.company_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_privileged_user(auth.uid()));

CREATE POLICY "Privileged users can update company_settings"
  ON public.company_settings FOR UPDATE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 13. SOURCING_PROJECTS TABLE - Team-based access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view sourcing_projects" ON public.sourcing_projects;
DROP POLICY IF EXISTS "Authenticated users can insert sourcing_projects" ON public.sourcing_projects;
DROP POLICY IF EXISTS "Authenticated users can update sourcing_projects" ON public.sourcing_projects;
DROP POLICY IF EXISTS "Authenticated users can delete sourcing_projects" ON public.sourcing_projects;

CREATE POLICY "Authorized users can view sourcing_projects"
  ON public.sourcing_projects FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team)
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'marketing')
  );

CREATE POLICY "Sourcing can insert sourcing_projects"
  ON public.sourcing_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'marketing')
  );

CREATE POLICY "Team members can update sourcing_projects"
  ON public.sourcing_projects FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team)
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
  );

CREATE POLICY "Privileged users can delete sourcing_projects"
  ON public.sourcing_projects FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 14. SOURCING_ITEMS TABLE - Based on project access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view sourcing_items" ON public.sourcing_items;
DROP POLICY IF EXISTS "Authenticated users can insert sourcing_items" ON public.sourcing_items;
DROP POLICY IF EXISTS "Authenticated users can update sourcing_items" ON public.sourcing_items;
DROP POLICY IF EXISTS "Authenticated users can delete sourcing_items" ON public.sourcing_items;

CREATE POLICY "Users with project access can view sourcing_items"
  ON public.sourcing_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sourcing_projects 
      WHERE sourcing_projects.id = sourcing_items.project_id
      AND (
        auth.uid() = ANY(sourcing_projects.assigned_team)
        OR is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sourcing')
        OR has_role(auth.uid(), 'sales')
      )
    )
  );

CREATE POLICY "Sourcing can insert sourcing_items"
  ON public.sourcing_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sourcing_projects 
      WHERE sourcing_projects.id = sourcing_items.project_id
      AND (
        is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sourcing')
      )
    )
  );

CREATE POLICY "Sourcing can update sourcing_items"
  ON public.sourcing_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sourcing_projects 
      WHERE sourcing_projects.id = sourcing_items.project_id
      AND (
        auth.uid() = ANY(sourcing_projects.assigned_team)
        OR is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'sourcing')
      )
    )
  );

CREATE POLICY "Privileged users can delete sourcing_items"
  ON public.sourcing_items FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 15. QC_INSPECTIONS TABLE - QC and related order access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view qc_inspections" ON public.qc_inspections;
DROP POLICY IF EXISTS "Authenticated users can insert qc_inspections" ON public.qc_inspections;
DROP POLICY IF EXISTS "Authenticated users can update qc_inspections" ON public.qc_inspections;
DROP POLICY IF EXISTS "Authenticated users can delete qc_inspections" ON public.qc_inspections;

CREATE POLICY "Authorized users can view qc_inspections"
  ON public.qc_inspections FOR SELECT
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'qc')
    OR has_role(auth.uid(), 'production')
    OR EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = qc_inspections.order_id
      AND auth.uid() = ANY(orders.assigned_team)
    )
  );

CREATE POLICY "QC can insert qc_inspections"
  ON public.qc_inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'qc')
  );

CREATE POLICY "QC can update qc_inspections"
  ON public.qc_inspections FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'qc')
  );

CREATE POLICY "Privileged users can delete qc_inspections"
  ON public.qc_inspections FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 16. QC_INSPECTION_ITEMS TABLE - Based on inspection access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view qc_inspection_items" ON public.qc_inspection_items;
DROP POLICY IF EXISTS "Authenticated users can insert qc_inspection_items" ON public.qc_inspection_items;
DROP POLICY IF EXISTS "Authenticated users can update qc_inspection_items" ON public.qc_inspection_items;
DROP POLICY IF EXISTS "Authenticated users can delete qc_inspection_items" ON public.qc_inspection_items;

CREATE POLICY "Users with inspection access can view qc_inspection_items"
  ON public.qc_inspection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.qc_inspections 
      WHERE qc_inspections.id = qc_inspection_items.inspection_id
      AND (
        is_privileged_user(auth.uid())
        OR has_role(auth.uid(), 'qc')
        OR has_role(auth.uid(), 'production')
      )
    )
  );

CREATE POLICY "QC can insert qc_inspection_items"
  ON public.qc_inspection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'qc')
  );

CREATE POLICY "QC can update qc_inspection_items"
  ON public.qc_inspection_items FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'qc')
  );

CREATE POLICY "Privileged users can delete qc_inspection_items"
  ON public.qc_inspection_items FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 17. TASKS TABLE - Owner/assignee based access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

CREATE POLICY "Users can view assigned or created tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() 
    OR created_by = auth.uid() 
    OR is_privileged_user(auth.uid())
  );

CREATE POLICY "Authenticated users can insert tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() 
    OR created_by = auth.uid() 
    OR is_privileged_user(auth.uid())
  );

CREATE POLICY "Users can delete their tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR is_privileged_user(auth.uid())
  );

-- =====================================================
-- 18. PROJECTS TABLE - Team-based access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Team members can view projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team)
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "Authorized users can insert projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "Team members can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_team)
    OR is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "Privileged users can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 19. PRODUCT_PHOTOS TABLE - Based on order item access
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view product_photos" ON public.product_photos;
DROP POLICY IF EXISTS "Authenticated users can insert product_photos" ON public.product_photos;
DROP POLICY IF EXISTS "Authenticated users can update product_photos" ON public.product_photos;
DROP POLICY IF EXISTS "Authenticated users can delete product_photos" ON public.product_photos;

CREATE POLICY "Authenticated users can view product_photos"
  ON public.product_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can insert product_photos"
  ON public.product_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'qc')
    OR has_role(auth.uid(), 'merchandising')
  );

CREATE POLICY "Authorized users can update product_photos"
  ON public.product_photos FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'qc')
  );

CREATE POLICY "Privileged users can delete product_photos"
  ON public.product_photos FOR DELETE
  TO authenticated
  USING (is_privileged_user(auth.uid()));

-- =====================================================
-- 20. PROFILES TABLE - Keep public SELECT, restrict updates
-- =====================================================
-- Profiles SELECT is intentionally public for user lookup in the app
-- UPDATE is already restricted to own profile