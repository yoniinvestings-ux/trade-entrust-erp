-- Create NCR (Non-Conformance Reports) table for QC corrective action tracking
CREATE TABLE public.ncr_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_number TEXT NOT NULL UNIQUE,
  qc_inspection_id UUID REFERENCES public.qc_inspections(id) ON DELETE SET NULL,
  qc_inspection_item_id UUID REFERENCES public.qc_inspection_items(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  
  -- NCR Classification
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor')) DEFAULT 'minor',
  category TEXT NOT NULL CHECK (category IN ('quality', 'safety', 'specification', 'packaging', 'delivery', 'documentation', 'other')) DEFAULT 'quality',
  
  -- Description
  title TEXT NOT NULL,
  description TEXT,
  root_cause TEXT,
  root_cause_cn TEXT,
  
  -- Photos and evidence
  photo_urls TEXT[] DEFAULT '{}',
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'pending_action', 'action_in_progress', 'verification', 'closed', 'cancelled')) DEFAULT 'open',
  
  -- Corrective action
  corrective_action TEXT,
  corrective_action_cn TEXT,
  preventive_action TEXT,
  preventive_action_cn TEXT,
  
  -- Responsibility
  raised_by UUID,
  assigned_to UUID,
  verified_by UUID,
  
  -- Dates
  due_date DATE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Costs
  cost_impact DECIMAL(12,2) DEFAULT 0,
  cost_currency TEXT DEFAULT 'USD',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create NCR number generator function
CREATE OR REPLACE FUNCTION public.generate_ncr_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_month TEXT;
  seq_num INTEGER;
BEGIN
  year_month := 'NCR-' || TO_CHAR(NOW(), 'YYMM');
  SELECT COALESCE(MAX(CAST(SUBSTRING(ncr_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.ncr_reports
  WHERE ncr_number LIKE year_month || '%';
  RETURN year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
END;
$$;

-- Add more request types to customer_service_requests
ALTER TABLE public.customer_service_requests 
DROP CONSTRAINT IF EXISTS customer_service_requests_request_type_check;

ALTER TABLE public.customer_service_requests
ADD CONSTRAINT customer_service_requests_request_type_check 
CHECK (request_type IN (
  'after_sales', 'reorder', 'inquiry', 'complaint',
  'general_inquiry', 'order_issue', 'shipping_inquiry', 
  'quality_complaint', 'return_request', 'invoice_request', 
  'warranty_claim', 'repair_request', 'replacement_request',
  'other'
));

-- Add created_by field to track who created the request (sales on behalf of customer)
ALTER TABLE public.customer_service_requests
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS created_on_behalf BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Enable RLS
ALTER TABLE public.ncr_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for ncr_reports
CREATE POLICY "Authenticated users can view NCRs"
ON public.ncr_reports
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create NCRs"
ON public.ncr_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update NCRs"
ON public.ncr_reports
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete NCRs"
ON public.ncr_reports
FOR DELETE
TO authenticated
USING (true);

-- Add indexes for performance
CREATE INDEX idx_ncr_reports_status ON public.ncr_reports(status);
CREATE INDEX idx_ncr_reports_severity ON public.ncr_reports(severity);
CREATE INDEX idx_ncr_reports_order_id ON public.ncr_reports(order_id);
CREATE INDEX idx_ncr_reports_supplier_id ON public.ncr_reports(supplier_id);
CREATE INDEX idx_ncr_reports_assigned_to ON public.ncr_reports(assigned_to);