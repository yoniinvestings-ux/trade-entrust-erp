-- Create shipment_items junction table to track specific items in each shipment
CREATE TABLE public.shipment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity_shipped INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shipment_id, order_item_id)
);

-- Enable RLS
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view shipment_items" 
ON public.shipment_items FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert shipment_items" 
ON public.shipment_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipment_items" 
ON public.shipment_items FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete shipment_items" 
ON public.shipment_items FOR DELETE USING (true);

-- Add factory_city column to shipments table
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS factory_city TEXT;

-- Add total_cbm column to shipments table  
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS total_cbm NUMERIC DEFAULT 0;