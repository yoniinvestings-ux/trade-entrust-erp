-- Fix currency constraint to include more currencies
ALTER TABLE financial_records DROP CONSTRAINT IF EXISTS financial_records_currency_check;
ALTER TABLE financial_records ADD CONSTRAINT financial_records_currency_check 
  CHECK (currency = ANY (ARRAY['USD', 'EUR', 'GBP', 'CNY', 'RMB']));

-- Add void status if not present
ALTER TABLE financial_records DROP CONSTRAINT IF EXISTS financial_records_status_check;
ALTER TABLE financial_records ADD CONSTRAINT financial_records_status_check 
  CHECK (status = ANY (ARRAY['pending', 'completed', 'cancelled', 'refunded', 'processing', 'failed', 'void']));