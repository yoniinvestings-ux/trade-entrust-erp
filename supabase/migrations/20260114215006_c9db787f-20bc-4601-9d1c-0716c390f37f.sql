-- Add assigned_team column to purchase_orders table
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS assigned_team UUID[] DEFAULT '{}';