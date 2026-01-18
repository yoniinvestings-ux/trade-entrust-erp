-- =============================================
-- FIX SUPPLIERS TABLE POLICIES
-- =============================================

-- Drop ALL old policies on suppliers
DROP POLICY IF EXISTS "Sourcing can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Team members can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Privileged users can delete suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authorized users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Permission-based view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Permission-based insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Permission-based update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Permission-based delete suppliers" ON suppliers;

-- Create new permission-based policies for suppliers
CREATE POLICY "Permission-based view suppliers"
ON suppliers FOR SELECT
USING (has_permission(auth.uid(), 'suppliers', 'view'));

CREATE POLICY "Permission-based insert suppliers"
ON suppliers FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'suppliers', 'create'));

CREATE POLICY "Permission-based update suppliers"
ON suppliers FOR UPDATE
USING (has_permission(auth.uid(), 'suppliers', 'edit'));

CREATE POLICY "Permission-based delete suppliers"
ON suppliers FOR DELETE
USING (has_permission(auth.uid(), 'suppliers', 'delete'));

-- =============================================
-- CLEAN UP SOURCING_PROJECTS DUPLICATE POLICIES
-- =============================================

-- Drop old hardcoded policies
DROP POLICY IF EXISTS "Authorized users can view sourcing_projects" ON sourcing_projects;
DROP POLICY IF EXISTS "Team members can update sourcing_projects" ON sourcing_projects;
DROP POLICY IF EXISTS "Privileged users can delete sourcing_projects" ON sourcing_projects;
DROP POLICY IF EXISTS "Sourcing can insert sourcing_projects" ON sourcing_projects;

-- =============================================
-- FIX PURCHASE_ORDERS TABLE POLICIES
-- =============================================

DROP POLICY IF EXISTS "Team members can insert purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Team members can update purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Privileged users can delete purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Team members can view purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Permission-based view purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Permission-based insert purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Permission-based update purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Permission-based delete purchase_orders" ON purchase_orders;

CREATE POLICY "Permission-based view purchase_orders"
ON purchase_orders FOR SELECT
USING (has_permission(auth.uid(), 'purchase_orders', 'view'));

CREATE POLICY "Permission-based insert purchase_orders"
ON purchase_orders FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'purchase_orders', 'create'));

CREATE POLICY "Permission-based update purchase_orders"
ON purchase_orders FOR UPDATE
USING (has_permission(auth.uid(), 'purchase_orders', 'edit'));

CREATE POLICY "Permission-based delete purchase_orders"
ON purchase_orders FOR DELETE
USING (has_permission(auth.uid(), 'purchase_orders', 'delete'));

-- =============================================
-- FIX QC_INSPECTIONS TABLE POLICIES
-- =============================================

DROP POLICY IF EXISTS "QC team can insert inspections" ON qc_inspections;
DROP POLICY IF EXISTS "QC team can update inspections" ON qc_inspections;
DROP POLICY IF EXISTS "Privileged users can delete inspections" ON qc_inspections;
DROP POLICY IF EXISTS "Team members can view inspections" ON qc_inspections;
DROP POLICY IF EXISTS "Permission-based view qc_inspections" ON qc_inspections;
DROP POLICY IF EXISTS "Permission-based insert qc_inspections" ON qc_inspections;
DROP POLICY IF EXISTS "Permission-based update qc_inspections" ON qc_inspections;
DROP POLICY IF EXISTS "Permission-based delete qc_inspections" ON qc_inspections;

CREATE POLICY "Permission-based view qc_inspections"
ON qc_inspections FOR SELECT
USING (has_permission(auth.uid(), 'qc_inspections', 'view'));

CREATE POLICY "Permission-based insert qc_inspections"
ON qc_inspections FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'qc_inspections', 'create'));

CREATE POLICY "Permission-based update qc_inspections"
ON qc_inspections FOR UPDATE
USING (has_permission(auth.uid(), 'qc_inspections', 'edit'));

CREATE POLICY "Permission-based delete qc_inspections"
ON qc_inspections FOR DELETE
USING (has_permission(auth.uid(), 'qc_inspections', 'delete'));

-- =============================================
-- FIX SHIPMENTS TABLE POLICIES
-- =============================================

DROP POLICY IF EXISTS "Logistics can insert shipments" ON shipments;
DROP POLICY IF EXISTS "Logistics can update shipments" ON shipments;
DROP POLICY IF EXISTS "Privileged users can delete shipments" ON shipments;
DROP POLICY IF EXISTS "Team members can view shipments" ON shipments;
DROP POLICY IF EXISTS "Permission-based view shipments" ON shipments;
DROP POLICY IF EXISTS "Permission-based insert shipments" ON shipments;
DROP POLICY IF EXISTS "Permission-based update shipments" ON shipments;
DROP POLICY IF EXISTS "Permission-based delete shipments" ON shipments;

CREATE POLICY "Permission-based view shipments"
ON shipments FOR SELECT
USING (has_permission(auth.uid(), 'shipments', 'view'));

CREATE POLICY "Permission-based insert shipments"
ON shipments FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'shipments', 'create'));

CREATE POLICY "Permission-based update shipments"
ON shipments FOR UPDATE
USING (has_permission(auth.uid(), 'shipments', 'edit'));

CREATE POLICY "Permission-based delete shipments"
ON shipments FOR DELETE
USING (has_permission(auth.uid(), 'shipments', 'delete'));

-- =============================================
-- FIX FINANCIAL_RECORDS TABLE POLICIES
-- =============================================

DROP POLICY IF EXISTS "Finance can insert records" ON financial_records;
DROP POLICY IF EXISTS "Finance can update records" ON financial_records;
DROP POLICY IF EXISTS "Privileged users can delete records" ON financial_records;
DROP POLICY IF EXISTS "Team members can view records" ON financial_records;
DROP POLICY IF EXISTS "Permission-based view financial_records" ON financial_records;
DROP POLICY IF EXISTS "Permission-based insert financial_records" ON financial_records;
DROP POLICY IF EXISTS "Permission-based update financial_records" ON financial_records;
DROP POLICY IF EXISTS "Permission-based delete financial_records" ON financial_records;

CREATE POLICY "Permission-based view financial_records"
ON financial_records FOR SELECT
USING (has_permission(auth.uid(), 'finance', 'view'));

CREATE POLICY "Permission-based insert financial_records"
ON financial_records FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'finance', 'create'));

CREATE POLICY "Permission-based update financial_records"
ON financial_records FOR UPDATE
USING (has_permission(auth.uid(), 'finance', 'edit'));

CREATE POLICY "Permission-based delete financial_records"
ON financial_records FOR DELETE
USING (has_permission(auth.uid(), 'finance', 'delete'));

-- =============================================
-- FIX EMPLOYEES TABLE POLICIES
-- =============================================

DROP POLICY IF EXISTS "HR can insert employees" ON employees;
DROP POLICY IF EXISTS "HR can update employees" ON employees;
DROP POLICY IF EXISTS "Privileged users can delete employees" ON employees;
DROP POLICY IF EXISTS "Team members can view employees" ON employees;
DROP POLICY IF EXISTS "Permission-based view employees" ON employees;
DROP POLICY IF EXISTS "Permission-based insert employees" ON employees;
DROP POLICY IF EXISTS "Permission-based update employees" ON employees;
DROP POLICY IF EXISTS "Permission-based delete employees" ON employees;

CREATE POLICY "Permission-based view employees"
ON employees FOR SELECT
USING (has_permission(auth.uid(), 'finance', 'view'));

CREATE POLICY "Permission-based insert employees"
ON employees FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'finance', 'create'));

CREATE POLICY "Permission-based update employees"
ON employees FOR UPDATE
USING (has_permission(auth.uid(), 'finance', 'edit'));

CREATE POLICY "Permission-based delete employees"
ON employees FOR DELETE
USING (has_permission(auth.uid(), 'finance', 'delete'));