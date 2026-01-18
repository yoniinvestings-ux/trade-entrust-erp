-- Drop the old check constraint for quotations status
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- Add a new check constraint that includes 'converted' status
ALTER TABLE public.quotations ADD CONSTRAINT quotations_status_check 
  CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'));