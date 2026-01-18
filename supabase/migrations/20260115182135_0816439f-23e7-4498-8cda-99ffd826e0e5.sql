-- =====================================================
-- PHASE 1: PAYMENT ALLOCATIONS TABLE
-- Enables one payment to be split across multiple orders/invoices
-- =====================================================

CREATE TABLE public.payment_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  financial_record_id UUID NOT NULL REFERENCES public.financial_records(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  allocated_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure at least one reference is set
  CONSTRAINT payment_allocation_has_reference CHECK (order_id IS NOT NULL OR purchase_order_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view payment_allocations"
ON public.payment_allocations FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Finance users can insert payment_allocations"
ON public.payment_allocations FOR INSERT
WITH CHECK (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Finance users can update payment_allocations"
ON public.payment_allocations FOR UPDATE
USING (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Finance users can delete payment_allocations"
ON public.payment_allocations FOR DELETE
USING (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_payment_allocations_updated_at
  BEFORE UPDATE ON public.payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PHASE 2: UPDATE CUSTOMER LEDGER VIEW
-- Dynamic calculation excluding cancelled orders
-- =====================================================

DROP VIEW IF EXISTS public.customer_ledger;

CREATE VIEW public.customer_ledger AS
SELECT 
  c.id AS customer_id,
  c.company_name,
  c.contact_person,
  COUNT(o.id) FILTER (WHERE o.status NOT IN ('cancelled')) AS total_orders,
  COUNT(o.id) FILTER (WHERE o.status NOT IN ('cancelled', 'delivered', 'completed') AND o.status != 'draft') AS active_orders,
  COALESCE(SUM(o.total_value) FILTER (WHERE o.status NOT IN ('cancelled')), 0) AS total_order_value,
  -- Calculate payments: first from payment_allocations, fallback to financial_records
  COALESCE(
    (SELECT SUM(pa.allocated_amount) 
     FROM payment_allocations pa 
     INNER JOIN orders ord ON pa.order_id = ord.id 
     WHERE ord.customer_id = c.id AND ord.status NOT IN ('cancelled')),
    (SELECT SUM(fr.amount) 
     FROM financial_records fr 
     WHERE fr.customer_id = c.id AND fr.type = 'customer_payment' AND fr.status != 'void')
  ) AS total_paid,
  -- Balance = Order Value - Paid
  COALESCE(SUM(o.total_value) FILTER (WHERE o.status NOT IN ('cancelled')), 0) -
  COALESCE(
    (SELECT SUM(pa.allocated_amount) 
     FROM payment_allocations pa 
     INNER JOIN orders ord ON pa.order_id = ord.id 
     WHERE ord.customer_id = c.id AND ord.status NOT IN ('cancelled')),
    (SELECT SUM(fr.amount) 
     FROM financial_records fr 
     WHERE fr.customer_id = c.id AND fr.type = 'customer_payment' AND fr.status != 'void'),
    0
  ) AS balance_due
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.company_name, c.contact_person;

-- =====================================================
-- PHASE 3: CREATE SUPPLIER LEDGER VIEW
-- Track what you owe to each supplier (using supplier_name column)
-- =====================================================

CREATE OR REPLACE VIEW public.supplier_ledger AS
SELECT 
  s.id AS supplier_id,
  s.supplier_name,
  s.contact_person,
  COUNT(po.id) FILTER (WHERE po.status NOT IN ('cancelled')) AS total_pos,
  COUNT(po.id) FILTER (WHERE po.status NOT IN ('cancelled', 'delivered', 'completed')) AS active_pos,
  COALESCE(SUM(po.total_value) FILTER (WHERE po.status NOT IN ('cancelled')), 0) AS total_po_value,
  -- Calculate payments from payment_allocations or financial_records
  COALESCE(
    (SELECT SUM(pa.allocated_amount) 
     FROM payment_allocations pa 
     INNER JOIN purchase_orders pord ON pa.purchase_order_id = pord.id 
     WHERE pord.supplier_id = s.id AND pord.status NOT IN ('cancelled')),
    (SELECT SUM(fr.amount) 
     FROM financial_records fr 
     WHERE fr.supplier_id = s.id AND fr.type = 'supplier_payment' AND fr.status != 'void')
  ) AS total_paid,
  -- Balance = PO Value - Paid (what you owe)
  COALESCE(SUM(po.total_value) FILTER (WHERE po.status NOT IN ('cancelled')), 0) -
  COALESCE(
    (SELECT SUM(pa.allocated_amount) 
     FROM payment_allocations pa 
     INNER JOIN purchase_orders pord ON pa.purchase_order_id = pord.id 
     WHERE pord.supplier_id = s.id AND pord.status NOT IN ('cancelled')),
    (SELECT SUM(fr.amount) 
     FROM financial_records fr 
     WHERE fr.supplier_id = s.id AND fr.type = 'supplier_payment' AND fr.status != 'void'),
    0
  ) AS balance_owed
FROM suppliers s
LEFT JOIN purchase_orders po ON po.supplier_id = s.id
GROUP BY s.id, s.supplier_name, s.contact_person;

-- =====================================================
-- PHASE 4: CASCADE VOID TRIGGER FOR ORDERS
-- When order is cancelled, mark related financial records as void
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If order is being cancelled, void related financial records
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE financial_records 
    SET status = 'void', 
        notes = COALESCE(notes, '') || ' [Auto-voided: Order cancelled on ' || NOW()::date || ']'
    WHERE order_id = NEW.id AND status != 'void';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_order_status_change();

-- =====================================================
-- PHASE 5: CASCADE VOID TRIGGER FOR PURCHASE ORDERS
-- When PO is cancelled, mark related financial records as void
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_po_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If PO is being cancelled, void related financial records
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE financial_records 
    SET status = 'void', 
        notes = COALESCE(notes, '') || ' [Auto-voided: PO cancelled on ' || NOW()::date || ']'
    WHERE purchase_order_id = NEW.id AND status != 'void';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_po_status_change
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_po_status_change();

-- =====================================================
-- PHASE 6: CUSTOMER LEDGER ENTRIES TABLE
-- For storing individual ledger line items with running balance
-- =====================================================

CREATE TABLE public.customer_ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  serial_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  invoice_number TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  financial_record_id UUID REFERENCES public.financial_records(id) ON DELETE SET NULL,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  running_balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_ledger_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view customer_ledger_entries"
ON public.customer_ledger_entries FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Finance users can manage customer_ledger_entries"
ON public.customer_ledger_entries FOR ALL
USING (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'sales'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_customer_ledger_entries_updated_at
  BEFORE UPDATE ON public.customer_ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_customer_ledger_entries_customer_date 
ON public.customer_ledger_entries(customer_id, entry_date, serial_number);

-- =====================================================
-- PHASE 7: SUPPLIER LEDGER ENTRIES TABLE
-- For storing individual ledger line items with running balance
-- =====================================================

CREATE TABLE public.supplier_ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  serial_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  po_number TEXT,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  financial_record_id UUID REFERENCES public.financial_records(id) ON DELETE SET NULL,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  running_balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_ledger_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view supplier_ledger_entries"
ON public.supplier_ledger_entries FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Finance users can manage supplier_ledger_entries"
ON public.supplier_ledger_entries FOR ALL
USING (is_privileged_user(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'sourcing'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_supplier_ledger_entries_updated_at
  BEFORE UPDATE ON public.supplier_ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_supplier_ledger_entries_supplier_date 
ON public.supplier_ledger_entries(supplier_id, entry_date, serial_number);