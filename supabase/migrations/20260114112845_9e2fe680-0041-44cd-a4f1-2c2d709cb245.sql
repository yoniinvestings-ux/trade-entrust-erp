-- Create a view for supplier performance metrics
CREATE OR REPLACE VIEW public.supplier_performance AS
SELECT 
  s.id as supplier_id,
  s.supplier_name,
  s.contact_person,
  s.rating,
  s.reliability,
  s.total_pos,
  s.total_value,
  
  -- QC Inspection metrics
  COUNT(DISTINCT qi.id) as total_inspections,
  COUNT(DISTINCT CASE WHEN qi.status = 'passed' THEN qi.id END) as passed_inspections,
  COUNT(DISTINCT CASE WHEN qi.status = 'failed' THEN qi.id END) as failed_inspections,
  
  -- Calculate QC pass rate (0-100)
  CASE 
    WHEN COUNT(DISTINCT qi.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN qi.status = 'passed' THEN qi.id END)::NUMERIC / COUNT(DISTINCT qi.id)::NUMERIC) * 100, 1)
    ELSE NULL
  END as qc_pass_rate,
  
  -- Average defect rate from inspections
  ROUND(AVG(COALESCE(qi.defect_rate, 0)), 2) as avg_defect_rate,
  
  -- Delivery metrics from purchase orders
  COUNT(DISTINCT po.id) as total_purchase_orders,
  COUNT(DISTINCT CASE WHEN po.shipped_at IS NOT NULL AND po.delivery_date IS NOT NULL AND po.shipped_at <= po.delivery_date THEN po.id END) as on_time_deliveries,
  
  -- On-time delivery rate (0-100)
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN po.shipped_at IS NOT NULL AND po.delivery_date IS NOT NULL THEN po.id END) > 0
    THEN ROUND(
      (COUNT(DISTINCT CASE WHEN po.shipped_at IS NOT NULL AND po.delivery_date IS NOT NULL AND po.shipped_at <= po.delivery_date THEN po.id END)::NUMERIC 
       / COUNT(DISTINCT CASE WHEN po.shipped_at IS NOT NULL AND po.delivery_date IS NOT NULL THEN po.id END)::NUMERIC) * 100, 1
    )
    ELSE NULL
  END as on_time_delivery_rate,
  
  -- Calculate overall performance score (weighted average)
  -- QC Pass Rate: 40%, Defect Rate (inverted): 30%, On-Time Delivery: 30%
  ROUND(
    COALESCE(
      (
        -- QC Pass Rate contribution (40%)
        COALESCE(
          CASE 
            WHEN COUNT(DISTINCT qi.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN qi.status = 'passed' THEN qi.id END)::NUMERIC / COUNT(DISTINCT qi.id)::NUMERIC) * 40
            ELSE 40 -- Default to perfect if no inspections
          END, 40
        )
        +
        -- Defect Rate contribution (30%) - inverted so lower defect = higher score
        COALESCE(
          CASE 
            WHEN AVG(COALESCE(qi.defect_rate, 0)) IS NOT NULL
            THEN (1 - LEAST(AVG(COALESCE(qi.defect_rate, 0)) / 100, 1)) * 30
            ELSE 30 -- Default to perfect if no data
          END, 30
        )
        +
        -- On-Time Delivery contribution (30%)
        COALESCE(
          CASE 
            WHEN COUNT(DISTINCT CASE WHEN po.shipped_at IS NOT NULL AND po.delivery_date IS NOT NULL THEN po.id END) > 0
            THEN (COUNT(DISTINCT CASE WHEN po.shipped_at IS NOT NULL AND po.delivery_date IS NOT NULL AND po.shipped_at <= po.delivery_date THEN po.id END)::NUMERIC 
                 / COUNT(DISTINCT CASE WHEN po.shipped_at IS NOT NULL AND po.delivery_date IS NOT NULL THEN po.id END)::NUMERIC) * 30
            ELSE 30 -- Default to perfect if no deliveries
          END, 30
        )
      ), 100
    ), 1
  ) as performance_score

FROM public.suppliers s
LEFT JOIN public.purchase_orders po ON po.supplier_id = s.id
LEFT JOIN public.qc_inspections qi ON qi.po_id = po.id
GROUP BY s.id, s.supplier_name, s.contact_person, s.rating, s.reliability, s.total_pos, s.total_value;

-- Enable RLS on the view
ALTER VIEW public.supplier_performance SET (security_invoker = on);

-- Grant access to authenticated users
GRANT SELECT ON public.supplier_performance TO authenticated;