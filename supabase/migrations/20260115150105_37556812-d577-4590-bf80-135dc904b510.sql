-- Add photos and supplier_id columns to quotation_items
ALTER TABLE public.quotation_items 
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.quotation_items 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Add quotation_id and sourcing_project_id columns to qc_inspections for factory audit linking
ALTER TABLE public.qc_inspections 
ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL;

ALTER TABLE public.qc_inspections 
ADD COLUMN IF NOT EXISTS sourcing_project_id UUID REFERENCES public.sourcing_projects(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_qc_inspections_quotation_id ON public.qc_inspections(quotation_id);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_sourcing_project_id ON public.qc_inspections(sourcing_project_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_supplier_id ON public.quotation_items(supplier_id);