-- ================================================================
-- PHASE 1: Enhanced Sourcing, Trade Terms, Factory Payments
-- ================================================================

-- Add trade terms enum type for incoterms
DO $$ BEGIN
  CREATE TYPE trade_term AS ENUM ('EXW', 'FOB', 'CIF', 'DDP', 'DAP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add payment type enum for tracking deposits vs balance
DO $$ BEGIN
  CREATE TYPE payment_purpose AS ENUM ('customer_deposit', 'customer_balance', 'factory_deposit', 'factory_balance', 'shipping_cost', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ================================================================
-- 1. ENHANCE SOURCING_ITEMS with photos, priority, lead time, factory info
-- ================================================================
ALTER TABLE public.sourcing_items
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS factory_price DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS factory_currency TEXT DEFAULT 'RMB' CHECK (factory_currency IN ('USD', 'RMB')),
ADD COLUMN IF NOT EXISTS factory_notes TEXT,
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'searching', 'quoted', 'confirmed', 'rejected')),
ADD COLUMN IF NOT EXISTS model_number TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- ================================================================
-- 2. ENHANCE ORDERS with trade terms
-- ================================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS trade_term TEXT DEFAULT 'EXW' CHECK (trade_term IN ('EXW', 'FOB', 'CIF', 'DDP', 'DAP')),
ADD COLUMN IF NOT EXISTS sourcing_project_id UUID REFERENCES public.sourcing_projects(id),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS customer_deposit_amount DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_balance_amount DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_payment_status TEXT DEFAULT 'pending' CHECK (customer_payment_status IN ('pending', 'deposit_received', 'partial', 'fully_paid'));

-- ================================================================
-- 3. ENHANCE PURCHASE_ORDERS with trade terms and factory payments
-- ================================================================
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS trade_term TEXT DEFAULT 'EXW' CHECK (trade_term IN ('EXW', 'FOB', 'CIF', 'DDP', 'DAP')),
ADD COLUMN IF NOT EXISTS factory_deposit_amount DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS factory_deposit_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS factory_balance_amount DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS factory_balance_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_cost_currency TEXT DEFAULT 'USD' CHECK (shipping_cost_currency IN ('USD', 'RMB')),
ADD COLUMN IF NOT EXISTS factory_payment_currency TEXT DEFAULT 'RMB' CHECK (factory_payment_currency IN ('USD', 'RMB')),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'deposit_paid', 'balance_paid', 'fully_paid')),
ADD COLUMN IF NOT EXISTS product_name_cn TEXT,
ADD COLUMN IF NOT EXISTS specifications_cn TEXT;

-- ================================================================
-- 4. ENHANCE FINANCIAL_RECORDS with payment purpose and linking
-- ================================================================
ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS purpose TEXT CHECK (purpose IN ('customer_deposit', 'customer_balance', 'factory_deposit', 'factory_balance', 'shipping_cost', 'other')),
ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id),
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- ================================================================
-- 5. CREATE QUOTATIONS TABLE for customer quotes
-- ================================================================
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL UNIQUE,
  sourcing_project_id UUID REFERENCES public.sourcing_projects(id),
  lead_id UUID REFERENCES public.leads(id),
  customer_id UUID REFERENCES public.customers(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  total_value DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'RMB')),
  trade_term TEXT DEFAULT 'FOB' CHECK (trade_term IN ('EXW', 'FOB', 'CIF', 'DDP', 'DAP')),
  valid_until TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  sent_via TEXT CHECK (sent_via IN ('email', 'whatsapp', 'both')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================================================
-- 6. CREATE QUOTATION_ITEMS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
  sourcing_item_id UUID REFERENCES public.sourcing_items(id),
  product_name TEXT NOT NULL,
  model_number TEXT,
  specifications TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  lead_time_days INTEGER,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================================================
-- 7. CREATE CUSTOMER_LEDGER VIEW for payment tracking
-- ================================================================
CREATE OR REPLACE VIEW public.customer_ledger AS
SELECT 
  c.id as customer_id,
  c.company_name,
  c.contact_person,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status NOT IN ('delivered', 'cancelled') AND NOT COALESCE(o.is_archived, false)) as active_orders,
  COALESCE(SUM(o.total_value), 0) as total_order_value,
  COALESCE(SUM(fr.amount) FILTER (WHERE fr.type = 'payment' AND fr.status = 'completed'), 0) as total_paid,
  COALESCE(SUM(o.total_value), 0) - COALESCE(SUM(fr.amount) FILTER (WHERE fr.type = 'payment' AND fr.status = 'completed'), 0) as balance_due
FROM public.customers c
LEFT JOIN public.orders o ON o.customer_id = c.id
LEFT JOIN public.financial_records fr ON fr.order_id = o.id OR fr.customer_id = c.id
GROUP BY c.id, c.company_name, c.contact_person;

-- ================================================================
-- 8. ENABLE RLS ON NEW TABLES
-- ================================================================
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Quotations policies
CREATE POLICY "Authenticated users can view quotations" 
ON public.quotations FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can create quotations" 
ON public.quotations FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotations" 
ON public.quotations FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete quotations" 
ON public.quotations FOR DELETE 
TO authenticated USING (true);

-- Quotation items policies
CREATE POLICY "Authenticated users can view quotation items" 
ON public.quotation_items FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can create quotation items" 
ON public.quotation_items FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotation items" 
ON public.quotation_items FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete quotation items" 
ON public.quotation_items FOR DELETE 
TO authenticated USING (true);

-- ================================================================
-- 9. GENERATE QUOTATION NUMBER FUNCTION
-- ================================================================
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_prefix TEXT;
  next_number INTEGER;
  quotation_num TEXT;
BEGIN
  year_prefix := 'Q' || TO_CHAR(NOW(), 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM quotations
  WHERE quotation_number LIKE year_prefix || '%';
  
  quotation_num := year_prefix || LPAD(next_number::TEXT, 4, '0');
  RETURN quotation_num;
END;
$$;

-- ================================================================
-- 10. ADD INDEXES FOR PERFORMANCE
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_orders_archived ON public.orders(is_archived);
CREATE INDEX IF NOT EXISTS idx_orders_sourcing ON public.orders(sourcing_project_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(customer_payment_status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment ON public.purchase_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_financial_records_purpose ON public.financial_records(purpose);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_sourcing_items_status ON public.sourcing_items(status);