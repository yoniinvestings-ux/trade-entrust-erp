-- Create junction table for shipment-orders relationship (one shipment can have multiple orders)
CREATE TABLE public.shipment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shipment_id, order_id)
);

-- Enable RLS
ALTER TABLE public.shipment_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view shipment_orders" 
ON public.shipment_orders FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert shipment_orders" 
ON public.shipment_orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can delete shipment_orders" 
ON public.shipment_orders FOR DELETE USING (true);

-- Make order_id nullable on shipments since we'll use the junction table
ALTER TABLE public.shipments ALTER COLUMN order_id DROP NOT NULL;