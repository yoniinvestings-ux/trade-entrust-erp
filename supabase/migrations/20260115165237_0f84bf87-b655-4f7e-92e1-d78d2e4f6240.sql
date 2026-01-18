-- Add assigned_team column to quotations table
ALTER TABLE public.quotations 
ADD COLUMN assigned_team TEXT[] DEFAULT NULL;

-- Add index for better query performance when filtering by team
CREATE INDEX idx_quotations_assigned_team ON public.quotations USING GIN (assigned_team);