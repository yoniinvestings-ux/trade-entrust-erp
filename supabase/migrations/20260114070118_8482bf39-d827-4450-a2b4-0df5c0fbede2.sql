-- Add lead time fields to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS factory_lead_days integer,
ADD COLUMN IF NOT EXISTS customer_lead_days integer,
ADD COLUMN IF NOT EXISTS order_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS po_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS production_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS qc_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS estimated_ship_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS estimated_delivery_date timestamp with time zone;

-- Add lead time fields to purchase_orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS factory_lead_days integer,
ADD COLUMN IF NOT EXISTS production_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS production_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS qc_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS estimated_completion_date timestamp with time zone;

-- Create time_entries table for labor cost tracking
CREATE TABLE public.time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  activity_type text NOT NULL, -- 'order_handling', 'sourcing', 'qc', 'follow_up', 'customer_communication', 'other'
  description text,
  hours_spent numeric NOT NULL DEFAULT 0,
  hourly_rate numeric, -- employee hourly cost
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create order_milestones table for detailed timeline tracking
CREATE TABLE public.order_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  milestone_type text NOT NULL, -- 'order_confirmed', 'po_sent', 'production_started', 'qc_inspection', 'shipped', 'delivered'
  planned_date timestamp with time zone,
  actual_date timestamp with time zone,
  notes text,
  completed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create employee_stats view for workload tracking
CREATE OR REPLACE VIEW public.employee_workload AS
SELECT 
  p.user_id,
  p.display_name,
  p.department,
  COUNT(DISTINCT te.order_id) as active_orders,
  SUM(te.hours_spent) as total_hours_this_month,
  SUM(te.hours_spent * COALESCE(te.hourly_rate, 0)) as labor_cost_this_month
FROM public.profiles p
LEFT JOIN public.time_entries te ON te.user_id = p.user_id 
  AND te.date >= date_trunc('month', CURRENT_DATE)
GROUP BY p.user_id, p.display_name, p.department;

-- Enable RLS on new tables
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_entries
CREATE POLICY "Authenticated users can view time_entries"
ON public.time_entries FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own time_entries"
ON public.time_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time_entries"
ON public.time_entries FOR UPDATE
USING (auth.uid() = user_id OR is_privileged_user(auth.uid()));

CREATE POLICY "Privileged users can delete time_entries"
ON public.time_entries FOR DELETE
USING (is_privileged_user(auth.uid()));

-- RLS policies for order_milestones
CREATE POLICY "Authenticated users can view order_milestones"
ON public.order_milestones FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert order_milestones"
ON public.order_milestones FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update order_milestones"
ON public.order_milestones FOR UPDATE
USING (true);

-- Add index for performance
CREATE INDEX idx_time_entries_user_date ON public.time_entries(user_id, date);
CREATE INDEX idx_time_entries_order ON public.time_entries(order_id);
CREATE INDEX idx_order_milestones_order ON public.order_milestones(order_id);