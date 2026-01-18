import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface CustomerPortalData {
  customer: {
    id: string;
    company_name: string;
    contact_person: string;
    email: string;
    phone: string | null;
  } | null;
  access_level: string | null;
}

export function useCustomerPortalAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-portal-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('customer_users')
        .select(`
          customer_id,
          access_level,
          is_active,
          customers (
            id,
            company_name,
            contact_person,
            email,
            phone
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        customer: data.customers,
        access_level: data.access_level,
      } as CustomerPortalData;
    },
    enabled: !!user?.id,
  });
}

export function useCustomerOrders() {
  const { data: portalAccess } = useCustomerPortalAccess();

  return useQuery({
    queryKey: ['customer-orders', portalAccess?.customer?.id],
    queryFn: async () => {
      if (!portalAccess?.customer?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_value,
          currency,
          created_at,
          estimated_delivery_date,
          customer_payment_status,
          order_items (
            id,
            product_name,
            quantity,
            unit_price
          )
        `)
        .eq('customer_id', portalAccess.customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!portalAccess?.customer?.id,
  });
}

export function useCustomerOrderDetail(orderId: string | undefined) {
  const { data: portalAccess } = useCustomerPortalAccess();

  return useQuery({
    queryKey: ['customer-order-detail', orderId],
    queryFn: async () => {
      if (!orderId || !portalAccess?.customer?.id) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            model_number,
            quantity,
            unit_price,
            total_price,
            specifications
          )
        `)
        .eq('id', orderId)
        .eq('customer_id', portalAccess.customer.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!portalAccess?.customer?.id,
  });
}

export function useCustomerShipments() {
  const { data: portalAccess } = useCustomerPortalAccess();

  return useQuery({
    queryKey: ['customer-shipments', portalAccess?.customer?.id],
    queryFn: async () => {
      if (!portalAccess?.customer?.id) return [];

      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_number,
          carrier,
          status,
          estimated_delivery,
          actual_delivery,
          origin_city,
          origin_country,
          destination_city,
          destination_country,
          created_at,
          orders (
            order_number
          )
        `)
        .eq('customer_id', portalAccess.customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!portalAccess?.customer?.id,
  });
}

export function useCustomerServiceRequests() {
  const { data: portalAccess } = useCustomerPortalAccess();

  return useQuery({
    queryKey: ['customer-service-requests', portalAccess?.customer?.id],
    queryFn: async () => {
      if (!portalAccess?.customer?.id) return [];

      const { data, error } = await supabase
        .from('customer_service_requests')
        .select(`
          id,
          request_type,
          description,
          status,
          created_at,
          resolved_at,
          orders (
            order_number
          )
        `)
        .eq('customer_id', portalAccess.customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!portalAccess?.customer?.id,
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  const { data: portalAccess } = useCustomerPortalAccess();

  return useMutation({
    mutationFn: async (request: {
      request_type: string;
      description: string;
      order_id?: string;
    }) => {
      if (!portalAccess?.customer?.id) throw new Error('No customer access');

      const { data, error } = await supabase
        .from('customer_service_requests')
        .insert({
          customer_id: portalAccess.customer.id,
          request_type: request.request_type,
          description: request.description,
          order_id: request.order_id || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-service-requests'] });
    },
  });
}
