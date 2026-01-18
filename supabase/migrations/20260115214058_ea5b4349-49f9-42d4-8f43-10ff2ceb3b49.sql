-- Insert default permission settings for ALL new modules

-- DASHBOARD permissions
INSERT INTO permission_settings (role, module, can_view, can_create, can_edit, can_delete, can_assign)
VALUES 
  ('manager', 'dashboard', true, false, false, false, false),
  ('cfo', 'dashboard', true, false, false, false, false),
  ('sales', 'dashboard', true, false, false, false, false),
  ('sourcing', 'dashboard', true, false, false, false, false),
  ('marketing', 'dashboard', true, false, false, false, false),
  ('qc', 'dashboard', true, false, false, false, false),
  ('logistics', 'dashboard', true, false, false, false, false),
  ('finance', 'dashboard', true, false, false, false, false),
  ('production', 'dashboard', true, false, false, false, false),
  ('project_manager', 'dashboard', true, false, false, false, false),
  ('hr', 'dashboard', true, false, false, false, false),
  ('merchandising', 'dashboard', true, false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- SALES, MARKETING, HR, SALARY, AFTER_SALES, ADMIN, CUSTOMER_PORTAL, SUPPLIER_PORTAL, SETTINGS, ANALYTICS
INSERT INTO permission_settings (role, module, can_view, can_create, can_edit, can_delete, can_assign)
VALUES 
  ('manager', 'sales', true, true, true, true, true),
  ('cfo', 'sales', true, false, false, false, false),
  ('sales', 'sales', true, true, true, false, false),
  ('manager', 'marketing', true, true, true, true, true),
  ('marketing', 'marketing', true, true, true, true, true),
  ('manager', 'hr', true, true, true, true, true),
  ('hr', 'hr', true, true, true, true, true),
  ('manager', 'salary', true, true, true, true, true),
  ('cfo', 'salary', true, true, true, true, false),
  ('finance', 'salary', true, true, true, false, false),
  ('hr', 'salary', true, true, true, true, false),
  ('manager', 'after_sales', true, true, true, true, true),
  ('qc', 'after_sales', true, true, true, true, true),
  ('sales', 'after_sales', true, true, true, false, false),
  ('manager', 'customer_portal', true, true, true, true, true),
  ('sales', 'customer_portal', true, true, true, false, false),
  ('manager', 'supplier_portal', true, true, true, true, true),
  ('sourcing', 'supplier_portal', true, true, true, false, false),
  ('manager', 'settings', true, true, true, true, false),
  ('cfo', 'settings', true, false, true, false, false),
  ('manager', 'analytics', true, false, false, false, false),
  ('cfo', 'analytics', true, false, false, false, false),
  ('finance', 'analytics', true, false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- Update RLS for sourcing_projects (without created_by)
DROP POLICY IF EXISTS "Sourcing can view sourcing_projects" ON sourcing_projects;
DROP POLICY IF EXISTS "Sourcing can insert sourcing_projects" ON sourcing_projects;
DROP POLICY IF EXISTS "Sourcing can update sourcing_projects" ON sourcing_projects;
DROP POLICY IF EXISTS "Sourcing can delete sourcing_projects" ON sourcing_projects;
DROP POLICY IF EXISTS "Privileged users can view all sourcing_projects" ON sourcing_projects;
DROP POLICY IF EXISTS "Privileged users can manage sourcing_projects" ON sourcing_projects;

CREATE POLICY "Team-filtered view sourcing_projects"
ON sourcing_projects FOR SELECT
USING (
  has_permission(auth.uid(), 'sourcing', 'view')
  AND (is_privileged_user(auth.uid()) OR auth.uid() = ANY(assigned_team))
);

CREATE POLICY "Permission-based insert sourcing_projects"
ON sourcing_projects FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'sourcing', 'create'));

CREATE POLICY "Permission-based update sourcing_projects"
ON sourcing_projects FOR UPDATE
USING (has_permission(auth.uid(), 'sourcing', 'edit'));

CREATE POLICY "Permission-based delete sourcing_projects"
ON sourcing_projects FOR DELETE
USING (has_permission(auth.uid(), 'sourcing', 'delete'));

-- Update RLS for orders
DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Users can delete orders" ON orders;

CREATE POLICY "Team-filtered view orders"
ON orders FOR SELECT
USING (
  has_permission(auth.uid(), 'orders', 'view')
  AND (is_privileged_user(auth.uid()) OR auth.uid() = ANY(assigned_team) OR auth.uid() = created_by)
);

CREATE POLICY "Permission-based insert orders"
ON orders FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'orders', 'create'));

CREATE POLICY "Permission-based update orders"
ON orders FOR UPDATE
USING (has_permission(auth.uid(), 'orders', 'edit'));

CREATE POLICY "Permission-based delete orders"
ON orders FOR DELETE
USING (has_permission(auth.uid(), 'orders', 'delete'));

-- Update RLS for customers
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;
DROP POLICY IF EXISTS "Users can delete customers" ON customers;

CREATE POLICY "Team-filtered view customers"
ON customers FOR SELECT
USING (
  has_permission(auth.uid(), 'customers', 'view')
  AND (is_privileged_user(auth.uid()) OR auth.uid() = ANY(assigned_team))
);

CREATE POLICY "Permission-based insert customers"
ON customers FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'customers', 'create'));

CREATE POLICY "Permission-based update customers"
ON customers FOR UPDATE
USING (has_permission(auth.uid(), 'customers', 'edit'));

CREATE POLICY "Permission-based delete customers"
ON customers FOR DELETE
USING (has_permission(auth.uid(), 'customers', 'delete'));

-- Update RLS for leads
DROP POLICY IF EXISTS "Users can view leads" ON leads;
DROP POLICY IF EXISTS "Users can insert leads" ON leads;
DROP POLICY IF EXISTS "Users can update leads" ON leads;
DROP POLICY IF EXISTS "Users can delete leads" ON leads;

CREATE POLICY "Permission-based view leads"
ON leads FOR SELECT
USING (has_permission(auth.uid(), 'leads', 'view'));

CREATE POLICY "Permission-based insert leads"
ON leads FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'leads', 'create'));

CREATE POLICY "Permission-based update leads"
ON leads FOR UPDATE
USING (has_permission(auth.uid(), 'leads', 'edit'));

CREATE POLICY "Permission-based delete leads"
ON leads FOR DELETE
USING (has_permission(auth.uid(), 'leads', 'delete'));

-- Update RLS for financial_records with salary separation
DROP POLICY IF EXISTS "Users can view financial_records" ON financial_records;
DROP POLICY IF EXISTS "Users can insert financial_records" ON financial_records;
DROP POLICY IF EXISTS "Users can update financial_records" ON financial_records;
DROP POLICY IF EXISTS "Users can delete financial_records" ON financial_records;

CREATE POLICY "Permission-based view financial_records"
ON financial_records FOR SELECT
USING (
  CASE WHEN type = 'salary' THEN has_permission(auth.uid(), 'salary', 'view')
  ELSE has_permission(auth.uid(), 'finance', 'view') END
);

CREATE POLICY "Permission-based insert financial_records"
ON financial_records FOR INSERT
WITH CHECK (
  CASE WHEN type = 'salary' THEN has_permission(auth.uid(), 'salary', 'create')
  ELSE has_permission(auth.uid(), 'finance', 'create') END
);

CREATE POLICY "Permission-based update financial_records"
ON financial_records FOR UPDATE
USING (
  CASE WHEN type = 'salary' THEN has_permission(auth.uid(), 'salary', 'edit')
  ELSE has_permission(auth.uid(), 'finance', 'edit') END
);

CREATE POLICY "Permission-based delete financial_records"
ON financial_records FOR DELETE
USING (
  CASE WHEN type = 'salary' THEN has_permission(auth.uid(), 'salary', 'delete')
  ELSE has_permission(auth.uid(), 'finance', 'delete') END
);

-- Update RLS for employees (HR module)
DROP POLICY IF EXISTS "Users can view employees" ON employees;
DROP POLICY IF EXISTS "Users can insert employees" ON employees;
DROP POLICY IF EXISTS "Users can update employees" ON employees;
DROP POLICY IF EXISTS "Users can delete employees" ON employees;

CREATE POLICY "Permission-based view employees"
ON employees FOR SELECT
USING (has_permission(auth.uid(), 'hr', 'view'));

CREATE POLICY "Permission-based insert employees"
ON employees FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'hr', 'create'));

CREATE POLICY "Permission-based update employees"
ON employees FOR UPDATE
USING (has_permission(auth.uid(), 'hr', 'edit'));

CREATE POLICY "Permission-based delete employees"
ON employees FOR DELETE
USING (has_permission(auth.uid(), 'hr', 'delete'));