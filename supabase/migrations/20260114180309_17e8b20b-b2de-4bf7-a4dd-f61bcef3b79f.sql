-- Drop and recreate the status check constraint with all needed values
ALTER TABLE public.financial_records DROP CONSTRAINT IF EXISTS financial_records_status_check;
ALTER TABLE public.financial_records ADD CONSTRAINT financial_records_status_check 
CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded', 'processing', 'failed'));