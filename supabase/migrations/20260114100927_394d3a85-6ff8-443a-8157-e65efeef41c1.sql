-- Create company_settings table for document headers/bank info
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_name_cn text,
  address text,
  address_cn text,
  phone text,
  email text,
  logo_url text,
  bank_account_name text,
  bank_account_number text,
  bank_name text,
  bank_address text,
  bank_swift_code text,
  bank_code text,
  bank_branch text,
  bank_currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only privileged users can manage company settings
CREATE POLICY "Privileged users can view company_settings"
ON public.company_settings FOR SELECT
USING (is_privileged_user(auth.uid()));

CREATE POLICY "Privileged users can insert company_settings"
ON public.company_settings FOR INSERT
WITH CHECK (is_privileged_user(auth.uid()));

CREATE POLICY "Privileged users can update company_settings"
ON public.company_settings FOR UPDATE
USING (is_privileged_user(auth.uid()));

-- Add registration_number to customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS registration_number text;

-- Add packing details to order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS product_number text,
ADD COLUMN IF NOT EXISTS cartons integer,
ADD COLUMN IF NOT EXISTS gross_weight_kg numeric,
ADD COLUMN IF NOT EXISTS cbm numeric;

-- Add payment terms and delivery range to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_terms text,
ADD COLUMN IF NOT EXISTS delivery_term_start date,
ADD COLUMN IF NOT EXISTS delivery_term_end date;

-- Add bank details to suppliers
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS bank_account_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_address text,
ADD COLUMN IF NOT EXISTS bank_swift_code text;

-- Add contract terms and signature tracking to purchase_orders
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS packaging_requirements text,
ADD COLUMN IF NOT EXISTS quality_inspection_terms text,
ADD COLUMN IF NOT EXISTS buyer_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_signed_at timestamptz,
ADD COLUMN IF NOT EXISTS supplier_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS supplier_signed_at timestamptz;

-- Create generated_documents table to track all generated documents
CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  document_number text NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  file_url text,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid,
  metadata jsonb
);

-- Enable RLS on generated_documents
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view and create documents
CREATE POLICY "Authenticated users can view generated_documents"
ON public.generated_documents FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert generated_documents"
ON public.generated_documents FOR INSERT
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_generated_documents_order_id ON public.generated_documents(order_id);
CREATE INDEX idx_generated_documents_purchase_order_id ON public.generated_documents(purchase_order_id);
CREATE INDEX idx_generated_documents_document_type ON public.generated_documents(document_type);