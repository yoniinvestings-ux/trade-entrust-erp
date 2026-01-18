import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceRequest {
  id: string;
  customer_id: string;
  order_id: string | null;
  request_type: string;
  status: string;
  priority: string;
  description: string | null;
  items: any[];
  attachments: any[];
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_by: string | null;
  created_on_behalf: boolean;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: { id: string; company_name: string; contact_person: string; email: string };
  order?: { id: string; order_number: string; sourcing_project?: { project_title: string } | null };
  assigned_profile?: { display_name: string };
  created_by_profile?: { display_name: string };
}

export const SERVICE_REQUEST_TYPES = [
  { value: 'after_sales', label: 'After-Sales Service / 售后服务' },
  { value: 'warranty_claim', label: 'Warranty Claim / 保修索赔' },
  { value: 'repair_request', label: 'Repair Request / 维修请求' },
  { value: 'replacement_request', label: 'Replacement Request / 更换请求' },
  { value: 'return_request', label: 'Return Request / 退货请求' },
  { value: 'quality_complaint', label: 'Quality Complaint / 质量投诉' },
  { value: 'shipping_inquiry', label: 'Shipping Inquiry / 物流咨询' },
  { value: 'invoice_request', label: 'Invoice Request / 发票请求' },
  { value: 'reorder', label: 'Reorder / 复购' },
  { value: 'general_inquiry', label: 'General Inquiry / 一般咨询' },
  { value: 'other', label: 'Other / 其他' },
];

export const SERVICE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending / 待处理', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress / 处理中', color: 'bg-blue-500' },
  { value: 'waiting_customer', label: 'Waiting Customer / 等待客户', color: 'bg-yellow-500' },
  { value: 'resolved', label: 'Resolved / 已解决', color: 'bg-green-500' },
  { value: 'closed', label: 'Closed / 已关闭', color: 'bg-gray-600' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low / 低', color: 'bg-gray-400' },
  { value: 'normal', label: 'Normal / 普通', color: 'bg-blue-500' },
  { value: 'high', label: 'High / 高', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent / 紧急', color: 'bg-red-500' },
];

export function useServiceRequests(filters?: {
  status?: string;
  type?: string;
  customerId?: string;
  priority?: string;
}) {
  return useQuery({
    queryKey: ['service-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('customer_service_requests')
        .select(`
          *,
          customer:customers(id, company_name, contact_person, email),
          order:orders(id, order_number, sourcing_project:sourcing_projects(project_title))
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('request_type', filters.type);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ServiceRequest[];
    },
  });
}

export function useServiceRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['service-request', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('customer_service_requests')
        .select(`
          *,
          customer:customers(id, company_name, contact_person, email, phone, street, city, country),
          order:orders(id, order_number, total_value, currency)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch profiles
      let assigned_profile = null;
      let created_by_profile = null;

      if (data.assigned_to) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', data.assigned_to)
          .single();
        assigned_profile = profile;
      }

      if (data.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', data.created_by)
          .single();
        created_by_profile = profile;
      }

      return { ...data, assigned_profile, created_by_profile } as ServiceRequest;
    },
    enabled: !!id,
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      customer_id: string;
      order_id?: string;
      request_type: string;
      description: string;
      priority?: string;
      assigned_to?: string;
      items?: any[];
      attachments?: any[];
      created_on_behalf?: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const { data: request, error } = await supabase
        .from('customer_service_requests')
        .insert({
          ...data,
          status: 'pending',
          created_by: user.user?.id,
          created_on_behalf: data.created_on_behalf ?? true, // Default true for sales creating on behalf
        })
        .select()
        .single();

      if (error) throw error;
      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useUpdateServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<ServiceRequest>) => {
      const { error } = await supabase
        .from('customer_service_requests')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['service-request', variables.id] });
    },
  });
}

export function useResolveServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resolution_notes }: { id: string; resolution_notes: string }) => {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('customer_service_requests')
        .update({
          status: 'resolved',
          resolved_by: user.user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['service-request', variables.id] });
    },
  });
}
