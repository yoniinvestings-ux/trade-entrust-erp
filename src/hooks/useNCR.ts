import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NCRReport {
  id: string;
  ncr_number: string;
  qc_inspection_id: string | null;
  qc_inspection_item_id: string | null;
  order_id: string | null;
  purchase_order_id: string | null;
  supplier_id: string | null;
  severity: 'critical' | 'major' | 'minor';
  category: 'quality' | 'safety' | 'specification' | 'packaging' | 'delivery' | 'documentation' | 'other';
  title: string;
  description: string | null;
  root_cause: string | null;
  root_cause_cn: string | null;
  photo_urls: string[];
  status: 'open' | 'investigating' | 'pending_action' | 'action_in_progress' | 'verification' | 'closed' | 'cancelled';
  corrective_action: string | null;
  corrective_action_cn: string | null;
  preventive_action: string | null;
  preventive_action_cn: string | null;
  raised_by: string | null;
  assigned_to: string | null;
  verified_by: string | null;
  due_date: string | null;
  closed_at: string | null;
  cost_impact: number;
  cost_currency: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  order?: { id: string; order_number: string; customer?: { company_name: string } };
  purchase_order?: { id: string; po_number: string };
  supplier?: { id: string; supplier_name: string };
  qc_inspection?: { id: string; inspection_type: string; status: string };
  raised_by_profile?: { display_name: string };
  assigned_to_profile?: { display_name: string };
}

export const NCR_SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical / 严重', color: 'bg-red-600' },
  { value: 'major', label: 'Major / 重大', color: 'bg-orange-500' },
  { value: 'minor', label: 'Minor / 轻微', color: 'bg-yellow-500' },
];

export const NCR_CATEGORY_OPTIONS = [
  { value: 'quality', label: 'Quality / 质量' },
  { value: 'safety', label: 'Safety / 安全' },
  { value: 'specification', label: 'Specification / 规格' },
  { value: 'packaging', label: 'Packaging / 包装' },
  { value: 'delivery', label: 'Delivery / 交付' },
  { value: 'documentation', label: 'Documentation / 文档' },
  { value: 'other', label: 'Other / 其他' },
];

export const NCR_STATUS_OPTIONS = [
  { value: 'open', label: 'Open / 待处理', color: 'bg-blue-500' },
  { value: 'investigating', label: 'Investigating / 调查中', color: 'bg-purple-500' },
  { value: 'pending_action', label: 'Pending Action / 待整改', color: 'bg-yellow-500' },
  { value: 'action_in_progress', label: 'Action In Progress / 整改中', color: 'bg-orange-500' },
  { value: 'verification', label: 'Verification / 验证中', color: 'bg-cyan-500' },
  { value: 'closed', label: 'Closed / 已关闭', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled / 已取消', color: 'bg-gray-500' },
];

export function useNCRReports(filters?: {
  status?: string;
  severity?: string;
  supplierId?: string;
  orderId?: string;
}) {
  return useQuery({
    queryKey: ['ncr-reports', filters],
    queryFn: async () => {
      let query = supabase
        .from('ncr_reports')
        .select(`
          *,
          order:orders(id, order_number, customer:customers(company_name)),
          purchase_order:purchase_orders(id, po_number),
          supplier:suppliers(id, supplier_name),
          qc_inspection:qc_inspections(id, inspection_type, status)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.severity && filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }
      if (filters?.orderId) {
        query = query.eq('order_id', filters.orderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NCRReport[];
    },
  });
}

export function useNCRReport(id: string | undefined) {
  return useQuery({
    queryKey: ['ncr-report', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('ncr_reports')
        .select(`
          *,
          order:orders(id, order_number, customer:customers(company_name)),
          purchase_order:purchase_orders(id, po_number),
          supplier:suppliers(id, supplier_name, contact_person, email),
          qc_inspection:qc_inspections(id, inspection_type, status, inspection_date)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch profile names
      let raised_by_profile = null;
      let assigned_to_profile = null;

      if (data.raised_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', data.raised_by)
          .single();
        raised_by_profile = profile;
      }

      if (data.assigned_to) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', data.assigned_to)
          .single();
        assigned_to_profile = profile;
      }

      return { ...data, raised_by_profile, assigned_to_profile } as NCRReport;
    },
    enabled: !!id,
  });
}

export function useCreateNCR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      qc_inspection_id?: string;
      qc_inspection_item_id?: string;
      order_id?: string;
      purchase_order_id?: string;
      supplier_id?: string;
      severity: string;
      category: string;
      title: string;
      description?: string;
      photo_urls?: string[];
      assigned_to?: string;
      due_date?: string;
    }) => {
      // Generate NCR number
      const { data: ncrNumber, error: numError } = await supabase.rpc('generate_ncr_number');
      if (numError) throw numError;

      const { data: user } = await supabase.auth.getUser();

      const { data: ncr, error } = await supabase
        .from('ncr_reports')
        .insert({
          ncr_number: ncrNumber,
          ...data,
          raised_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return ncr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ncr-reports'] });
    },
  });
}

export function useUpdateNCR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<NCRReport>) => {
      const { error } = await supabase
        .from('ncr_reports')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ncr-reports'] });
      queryClient.invalidateQueries({ queryKey: ['ncr-report', variables.id] });
    },
  });
}

export function useCloseNCR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('ncr_reports')
        .update({
          status: 'closed',
          verified_by: user.user?.id,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ncr-reports'] });
      queryClient.invalidateQueries({ queryKey: ['ncr-report', variables.id] });
    },
  });
}
