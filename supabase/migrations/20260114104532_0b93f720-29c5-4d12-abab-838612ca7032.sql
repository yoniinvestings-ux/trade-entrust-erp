-- Create QC inspection items table for detailed checks
CREATE TABLE public.qc_inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.qc_inspections(id) ON DELETE CASCADE,
  check_category TEXT NOT NULL, -- 'appearance', 'function', 'measurement', 'safety', 'packaging'
  check_name TEXT NOT NULL,
  check_name_cn TEXT,
  requirement TEXT,
  requirement_cn TEXT,
  result TEXT NOT NULL DEFAULT 'pending', -- 'pass', 'fail', 'pending', 'minor_issue', 'major_issue'
  finding TEXT,
  finding_cn TEXT,
  corrective_action TEXT,
  corrective_action_cn TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add more fields to qc_inspections for scheduling and reporting
ALTER TABLE public.qc_inspections 
ADD COLUMN IF NOT EXISTS inspection_type TEXT DEFAULT 'final', -- 'dupro', 'final', 'pps'
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS aql_level TEXT DEFAULT 'S4',
ADD COLUMN IF NOT EXISTS sample_size INTEGER,
ADD COLUMN IF NOT EXISTS total_inspected INTEGER,
ADD COLUMN IF NOT EXISTS total_defects INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS critical_defects INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS major_defects INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minor_defects INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conclusion TEXT, -- 'accepted', 'rejected', 'pending_rework'
ADD COLUMN IF NOT EXISTS customer_visible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.qc_inspection_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for qc_inspection_items
CREATE POLICY "Authenticated users can view qc_inspection_items"
ON public.qc_inspection_items FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert qc_inspection_items"
ON public.qc_inspection_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update qc_inspection_items"
ON public.qc_inspection_items FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete qc_inspection_items"
ON public.qc_inspection_items FOR DELETE
USING (true);