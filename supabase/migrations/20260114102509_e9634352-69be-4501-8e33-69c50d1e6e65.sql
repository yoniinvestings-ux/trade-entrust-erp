-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Privileged users can view company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Privileged users can insert company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Privileged users can update company_settings" ON public.company_settings;

-- Create more permissive policies for company settings (single-tenant)
-- All authenticated users can view company settings
CREATE POLICY "Authenticated users can view company_settings"
  ON public.company_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can insert company settings (only one row should exist)
CREATE POLICY "Authenticated users can insert company_settings"
  ON public.company_settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update company settings
CREATE POLICY "Authenticated users can update company_settings"
  ON public.company_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL);