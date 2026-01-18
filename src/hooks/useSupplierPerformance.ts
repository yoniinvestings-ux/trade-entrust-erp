import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  contact_person: string;
  rating: number | null;
  reliability: string | null;
  total_pos: number | null;
  total_value: number | null;
  total_inspections: number | null;
  passed_inspections: number | null;
  failed_inspections: number | null;
  qc_pass_rate: number | null;
  avg_defect_rate: number | null;
  total_purchase_orders: number | null;
  on_time_deliveries: number | null;
  on_time_delivery_rate: number | null;
  performance_score: number | null;
}

export function useSupplierPerformance(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier-performance', supplierId],
    queryFn: async () => {
      if (supplierId) {
        const { data, error } = await supabase
          .from('supplier_performance')
          .select('*')
          .eq('supplier_id', supplierId)
          .maybeSingle();
        if (error) throw error;
        return data as SupplierPerformance | null;
      }

      const { data, error } = await supabase
        .from('supplier_performance')
        .select('*')
        .order('performance_score', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as SupplierPerformance[];
    },
    enabled: true,
  });
}

export function useSupplierPerformanceList() {
  return useQuery({
    queryKey: ['supplier-performance-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_performance')
        .select('*')
        .order('performance_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as SupplierPerformance[];
    },
  });
}

export function getPerformanceGrade(score: number | null): { grade: string; color: string; label: string } {
  if (score === null) return { grade: 'N/A', color: 'bg-gray-500', label: 'No Data' };
  if (score >= 90) return { grade: 'A+', color: 'bg-green-500', label: 'Excellent' };
  if (score >= 80) return { grade: 'A', color: 'bg-green-400', label: 'Very Good' };
  if (score >= 70) return { grade: 'B', color: 'bg-blue-500', label: 'Good' };
  if (score >= 60) return { grade: 'C', color: 'bg-yellow-500', label: 'Average' };
  if (score >= 50) return { grade: 'D', color: 'bg-orange-500', label: 'Below Average' };
  return { grade: 'F', color: 'bg-red-500', label: 'Poor' };
}

export function getMetricColor(value: number | null, thresholds: { good: number; warning: number }): string {
  if (value === null) return 'text-muted-foreground';
  if (value >= thresholds.good) return 'text-green-600';
  if (value >= thresholds.warning) return 'text-yellow-600';
  return 'text-red-600';
}
