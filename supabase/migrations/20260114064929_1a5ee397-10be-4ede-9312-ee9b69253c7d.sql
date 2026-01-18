-- Create storage bucket for product photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for design files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('design-files', 'design-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for project design files
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  sourcing_project_id UUID REFERENCES public.sourcing_projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID,
  CONSTRAINT project_files_order_or_sourcing CHECK (
    (order_id IS NOT NULL AND sourcing_project_id IS NULL) OR 
    (order_id IS NULL AND sourcing_project_id IS NOT NULL)
  )
);

-- Enable RLS on project_files
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_files
CREATE POLICY "Authenticated users can view project_files" 
ON public.project_files 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert project_files" 
ON public.project_files 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project_files" 
ON public.project_files 
FOR DELETE 
USING (true);

-- Storage policies for product-photos bucket
CREATE POLICY "Anyone can view product photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos');

CREATE POLICY "Authenticated users can upload product photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-photos' AND auth.role() = 'authenticated');

-- Storage policies for design-files bucket  
CREATE POLICY "Authenticated users can view design files"
ON storage.objects FOR SELECT
USING (bucket_id = 'design-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload design files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'design-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete design files"
ON storage.objects FOR DELETE
USING (bucket_id = 'design-files' AND auth.role() = 'authenticated');