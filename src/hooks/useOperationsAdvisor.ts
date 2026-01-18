import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Alert {
  id: string;
  type: 'critical' | 'urgent' | 'warning' | 'info';
  department: string;
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
  data?: Record<string, any>;
}

export interface DepartmentData {
  finance?: {
    overduePayments: number;
    overdueAmount: number;
    unpaidSalaries: number;
    totalBalance: number;
    expensesThisMonth: number;
  };
  orders?: {
    totalActive: number;
    withoutPO: number;
    stuck: number;
    urgentDeadlines: number;
    pendingPOs: number;
  };
  sales?: {
    totalLeads: number;
    newLeads: number;
    coldLeads: number;
    pendingQuotes: number;
    pipelineValue: number;
  };
  logistics?: {
    totalActive: number;
    delayed: number;
    noTracking: number;
    inTransit: number;
  };
  qc?: {
    pendingInspections: number;
    overdueInspections: number;
    failedInspections: number;
    openNCRs: number;
    openServiceRequests: number;
  };
  sourcing?: {
    activeProjects: number;
    stalledProjects: number;
    unconfirmedPOs: number;
    activeSuppliers: number;
  };
  hr?: {
    totalEmployees: number;
    unpaidThisMonth: number;
  };
}

export interface OperationsAdvisorResponse {
  success: boolean;
  overallScore: number;
  departmentScores: Record<string, number>;
  alerts: Alert[];
  departmentData: DepartmentData;
  aiAnalysis: string | null;
  analyzedAt: string;
}

export function useOperationsAdvisor(department: string = 'all', enabled: boolean = true) {
  return useQuery({
    queryKey: ['operations-advisor', department],
    queryFn: async (): Promise<OperationsAdvisorResponse> => {
      const { data, error } = await supabase.functions.invoke('operations-advisor', {
        body: { department, aggressiveness: 'aggressive' }
      });

      if (error) throw error;
      return data;
    },
    enabled,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
}

export function useFinanceAdvisor(enabled: boolean = true) {
  return useOperationsAdvisor('finance', enabled);
}

export function useOrdersAdvisor(enabled: boolean = true) {
  return useOperationsAdvisor('orders', enabled);
}

export function useSalesAdvisor(enabled: boolean = true) {
  return useOperationsAdvisor('sales', enabled);
}

export function useLogisticsAdvisor(enabled: boolean = true) {
  return useOperationsAdvisor('logistics', enabled);
}

export function useQCAdvisor(enabled: boolean = true) {
  return useOperationsAdvisor('qc', enabled);
}

export function useSourcingAdvisor(enabled: boolean = true) {
  return useOperationsAdvisor('sourcing', enabled);
}

export function useHRAdvisor(enabled: boolean = true) {
  return useOperationsAdvisor('hr', enabled);
}
