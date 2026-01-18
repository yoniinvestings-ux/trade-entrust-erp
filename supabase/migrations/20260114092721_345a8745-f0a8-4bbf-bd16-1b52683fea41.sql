-- Add photo_type column to distinguish customer vs factory photos
ALTER TABLE public.product_photos 
ADD COLUMN photo_type TEXT DEFAULT 'customer';

-- Add RLS policy for updating product_photos (needed for setting main photo)
CREATE POLICY "Authenticated users can update product_photos" 
ON public.product_photos 
FOR UPDATE 
USING (true);

-- Add RLS policy for deleting product_photos
CREATE POLICY "Authenticated users can delete product_photos" 
ON public.product_photos 
FOR DELETE 
USING (true);