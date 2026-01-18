-- Drop the existing type check constraint
ALTER TABLE financial_records DROP CONSTRAINT IF EXISTS financial_records_type_check;

-- Add updated type check constraint with customer_payment and supplier_payment
ALTER TABLE financial_records ADD CONSTRAINT financial_records_type_check 
CHECK (type = ANY (ARRAY['invoice'::text, 'payment'::text, 'expense'::text, 'refund'::text, 'customer_payment'::text, 'supplier_payment'::text, 'salary'::text]));