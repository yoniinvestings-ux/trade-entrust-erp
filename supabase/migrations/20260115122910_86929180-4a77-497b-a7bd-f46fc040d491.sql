-- Phase 1: Add preferred_currency to suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'RMB' 
CHECK (preferred_currency IN ('USD', 'RMB', 'EUR'));

-- Phase 2: Add supplier_id to order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id);

-- Phase 3: Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_name_cn TEXT,
  model_number TEXT NOT NULL,
  specifications TEXT,
  specifications_cn TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on purchase_order_items
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_order_items
CREATE POLICY "Authenticated users can view purchase_order_items"
  ON public.purchase_order_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authorized users can insert purchase_order_items"
  ON public.purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "Authorized users can update purchase_order_items"
  ON public.purchase_order_items FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'project_manager')
  );

CREATE POLICY "Authorized users can delete purchase_order_items"
  ON public.purchase_order_items FOR DELETE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'project_manager')
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier_id ON public.order_items(supplier_id);