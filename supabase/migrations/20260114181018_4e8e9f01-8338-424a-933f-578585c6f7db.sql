-- Add exchange_rate column to purchase_orders for currency conversion
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT NULL;

COMMENT ON COLUMN public.purchase_orders.exchange_rate IS 'Exchange rate to convert PO currency to USD (e.g., 6.8 for RMB to USD)';