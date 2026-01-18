-- Add conversion tracking columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS converted_to_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS converted_at timestamp with time zone;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_converted_to_customer_id ON public.leads(converted_to_customer_id);