-- Add UPDATE and DELETE policies for sourcing_items table
CREATE POLICY "Authenticated users can update sourcing_items" 
ON public.sourcing_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete sourcing_items" 
ON public.sourcing_items 
FOR DELETE 
USING (true);