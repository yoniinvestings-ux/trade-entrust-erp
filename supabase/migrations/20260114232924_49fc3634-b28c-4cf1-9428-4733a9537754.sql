
-- First create the updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create bank_accounts table for PingPong and XT accounts
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  current_balance NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create expense_categories table with hierarchy support
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.expense_categories(id),
  description TEXT,
  budget_monthly NUMERIC,
  budget_currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create employees table for salary management
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  employee_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  base_salary_usd NUMERIC NOT NULL DEFAULT 0,
  salary_currency TEXT DEFAULT 'CNY',
  bank_account TEXT,
  bank_name TEXT,
  hire_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cash_flow_snapshots table for AI forecasting
CREATE TABLE public.cash_flow_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  balance_usd NUMERIC,
  expected_inflows NUMERIC DEFAULT 0,
  expected_outflows NUMERIC DEFAULT 0,
  forecast_data JSONB,
  ai_analysis TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alter financial_records to add new columns
ALTER TABLE public.financial_records 
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id),
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.expense_categories(id),
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS amount_local NUMERIC,
  ADD COLUMN IF NOT EXISTS local_currency TEXT,
  ADD COLUMN IF NOT EXISTS salary_month TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Enable RLS on all new tables
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for bank_accounts
CREATE POLICY "Authenticated users can view bank_accounts"
  ON public.bank_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Finance users can manage bank_accounts"
  ON public.bank_accounts FOR ALL
  USING (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

-- RLS policies for expense_categories
CREATE POLICY "Authenticated users can view expense_categories"
  ON public.expense_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Finance users can manage expense_categories"
  ON public.expense_categories FOR ALL
  USING (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

-- RLS policies for employees
CREATE POLICY "Authenticated users can view employees"
  ON public.employees FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Finance and HR can manage employees"
  ON public.employees FOR ALL
  USING (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

-- RLS policies for cash_flow_snapshots
CREATE POLICY "Finance users can view cash_flow_snapshots"
  ON public.cash_flow_snapshots FOR SELECT
  USING (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Finance users can manage cash_flow_snapshots"
  ON public.cash_flow_snapshots FOR ALL
  USING (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

-- Insert default bank accounts (PingPong and XT)
INSERT INTO public.bank_accounts (name, bank_name, currency, is_default) VALUES
  ('PingPong', 'PingPong Payments', 'USD', true),
  ('XT', 'XT Bank', 'USD', false);

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description) VALUES
  ('Office', 'Office supplies and equipment'),
  ('Travel', 'Business travel expenses'),
  ('Marketing', 'Marketing and advertising'),
  ('Utilities', 'Electricity, internet, phone'),
  ('Equipment', 'Machinery and tools'),
  ('Software', 'Software subscriptions and licenses'),
  ('Professional Services', 'Legal, accounting, consulting'),
  ('Shipping', 'Freight and courier costs'),
  ('Miscellaneous', 'Other expenses');

-- Create updated_at triggers for new tables
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
