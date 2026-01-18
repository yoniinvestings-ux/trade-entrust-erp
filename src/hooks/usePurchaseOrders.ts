import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type PurchaseOrder = Tables<'purchase_orders'> & {
  supplier?: Tables<'suppliers'>;
  order?: Tables<'orders'> & {
    customer?: Tables<'customers'>;
    order_items?: Tables<'order_items'>[];
    sourcing_project?: { id: string; project_title: string } | null;
  };
};

export function usePurchaseOrders(filters?: {
  status?: string;
  supplierId?: string;
  orderId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(id, supplier_name, contact_person, email),
          order:orders(id, order_number, customer_id, total_value, customer:customers(id, company_name), sourcing_project:sourcing_projects(id, project_title))
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }
      if (filters?.orderId) {
        query = query.eq('order_id', filters.orderId);
      }
      if (filters?.search) {
        query = query.or(`po_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseOrder[];
    },
  });
}

export function usePurchaseOrder(poId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: async () => {
      if (!poId) return null;

      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          order:orders(*, customer:customers(*), order_items(*, product_photos(*)))
        `)
        .eq('id', poId)
        .single();

      if (error) throw error;
      return data as PurchaseOrder;
    },
    enabled: !!poId,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (po: Omit<TablesInsert<'purchase_orders'>, 'po_number'>) => {
      // Generate PO number
      const { data: poNumber, error: numError } = await supabase
        .rpc('generate_po_number');

      if (numError) throw numError;

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({ ...po, po_number: poNumber })
        .select(`
          *,
          supplier:suppliers(id, supplier_name),
          order:orders(id, order_number, total_value)
        `)
        .single();

      if (error) throw error;

      // Update order profit margin
      await updateOrderProfitMargin(po.order_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Purchase Order created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create PO: ' + error.message);
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'purchase_orders'> & { id: string }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(`*, order:orders(id, order_number, total_value)`)
        .single();

      if (error) throw error;

      // Update order profit margin if total_value changed
      if (updates.total_value !== undefined && data.order_id) {
        await updateOrderProfitMargin(data.order_id);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Purchase Order updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update PO: ' + error.message);
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (po: { id: string; order_id: string }) => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', po.id);

      if (error) throw error;

      // Update order profit margin
      await updateOrderProfitMargin(po.order_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Purchase Order deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete PO: ' + error.message);
    },
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('supplier_name');

      if (error) throw error;
      return data;
    },
  });
}

// Helper function to update order profit margin with currency conversion
async function updateOrderProfitMargin(orderId: string) {
  // Get all POs for this order with currency info
  const { data: pos, error: posError } = await supabase
    .from('purchase_orders')
    .select('total_value, currency, exchange_rate')
    .eq('order_id', orderId);

  if (posError) throw posError;

  // Calculate supplier total in USD (with currency conversion)
  const supplierTotalInUSD = pos?.reduce((sum, po) => {
    const poValue = po.total_value || 0;
    const poCurrency = po.currency || 'USD';
    const poRate = (po as any).exchange_rate || 6.8;
    
    // Convert RMB to USD: divide by exchange rate
    const valueInUSD = poCurrency === 'RMB' ? poValue / poRate : poValue;
    return sum + valueInUSD;
  }, 0) || 0;

  // Get order total (always in USD)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('total_value')
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  // Calculate profit margin (both values now in USD)
  const orderTotal = order?.total_value || 0;
  const profitMargin = orderTotal > 0 
    ? ((orderTotal - supplierTotalInUSD) / orderTotal) * 100 
    : 0;

  // Update order with new profit margin
  await supabase
    .from('orders')
    .update({ profit_margin: Math.round(profitMargin * 100) / 100 })
    .eq('id', orderId);
}
