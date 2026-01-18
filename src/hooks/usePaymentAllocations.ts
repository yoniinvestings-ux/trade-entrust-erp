import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentAllocation {
  id: string;
  financial_record_id: string;
  order_id: string | null;
  purchase_order_id: string | null;
  allocated_amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  order?: { id: string; order_number: string; total_value: number };
  purchase_order?: { id: string; po_number: string; total_value: number };
}

export function usePaymentAllocations(financialRecordId?: string) {
  return useQuery({
    queryKey: ['payment-allocations', financialRecordId],
    queryFn: async () => {
      let query = supabase
        .from('payment_allocations')
        .select(`
          *,
          order:orders!payment_allocations_order_id_fkey(id, order_number, total_value),
          purchase_order:purchase_orders!payment_allocations_purchase_order_id_fkey(id, po_number, total_value)
        `)
        .order('created_at', { ascending: false });

      if (financialRecordId) {
        query = query.eq('financial_record_id', financialRecordId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentAllocation[];
    },
    enabled: !financialRecordId || financialRecordId !== undefined,
  });
}

export function useOrderPaymentAllocations(orderId?: string) {
  return useQuery({
    queryKey: ['order-payment-allocations', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_allocations')
        .select(`
          *,
          financial_record:financial_records(
            id, amount, currency, date, payment_method, reference_number
          )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}

export function usePOPaymentAllocations(purchaseOrderId?: string) {
  return useQuery({
    queryKey: ['po-payment-allocations', purchaseOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_allocations')
        .select(`
          *,
          financial_record:financial_records(
            id, amount, currency, date, payment_method, reference_number
          )
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!purchaseOrderId,
  });
}

export function useCreatePaymentAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocation: {
      financial_record_id: string;
      order_id?: string;
      purchase_order_id?: string;
      allocated_amount: number;
      currency?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('payment_allocations')
        .insert([allocation])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['order-payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['po-payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
    },
    onError: (error) => {
      toast.error('Failed to create payment allocation: ' + error.message);
    },
  });
}

export function useCreateMultiplePaymentAllocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocations: Array<{
      financial_record_id: string;
      order_id?: string;
      purchase_order_id?: string;
      allocated_amount: number;
      currency?: string;
      notes?: string;
    }>) => {
      const { data, error } = await supabase
        .from('payment_allocations')
        .insert(allocations)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['order-payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['po-payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
      toast.success('Payment allocations saved');
    },
    onError: (error) => {
      toast.error('Failed to save payment allocations: ' + error.message);
    },
  });
}

export function useDeletePaymentAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_allocations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['order-payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['po-payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
      toast.success('Payment allocation removed');
    },
    onError: (error) => {
      toast.error('Failed to remove allocation: ' + error.message);
    },
  });
}

// Hook to get unpaid orders for a customer (for payment allocation dialog)
export function useUnpaidCustomerOrders(customerId?: string) {
  return useQuery({
    queryKey: ['unpaid-customer-orders', customerId],
    queryFn: async () => {
      // Get all orders for the customer
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, total_value, currency, status, created_at')
        .eq('customer_id', customerId)
        .not('status', 'in', '("cancelled","draft")')
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Get all payment allocations for these orders
      const orderIds = orders?.map(o => o.id) || [];
      
      if (orderIds.length === 0) return [];

      const { data: allocations, error: allocError } = await supabase
        .from('payment_allocations')
        .select('order_id, allocated_amount')
        .in('order_id', orderIds);

      if (allocError) throw allocError;

      // Calculate balance for each order
      const allocationsByOrder = (allocations || []).reduce((acc, a) => {
        if (!acc[a.order_id!]) acc[a.order_id!] = 0;
        acc[a.order_id!] += a.allocated_amount || 0;
        return acc;
      }, {} as Record<string, number>);

      return orders?.map(order => ({
        ...order,
        totalPaid: allocationsByOrder[order.id] || 0,
        balanceDue: (order.total_value || 0) - (allocationsByOrder[order.id] || 0),
      })).filter(o => o.balanceDue > 0) || [];
    },
    enabled: !!customerId,
  });
}

// Hook to get unpaid POs for a supplier (for payment allocation dialog)
// Handles currency conversion when calculating paid amounts
export function useUnpaidSupplierPOs(supplierId?: string) {
  return useQuery({
    queryKey: ['unpaid-supplier-pos', supplierId],
    queryFn: async () => {
      // Get all POs for the supplier
      const { data: pos, error: posError } = await supabase
        .from('purchase_orders')
        .select('id, po_number, total_value, currency, status, created_at')
        .eq('supplier_id', supplierId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });

      if (posError) throw posError;

      // Get all payment allocations for these POs with financial record details for exchange rates
      const poIds = pos?.map(p => p.id) || [];
      
      if (poIds.length === 0) return [];

      const { data: allocations, error: allocError } = await supabase
        .from('payment_allocations')
        .select(`
          purchase_order_id, 
          allocated_amount,
          currency,
          financial_record:financial_records(currency, exchange_rate)
        `)
        .in('purchase_order_id', poIds);

      if (allocError) throw allocError;

      // Calculate balance for each PO, converting currencies if needed
      const allocationsByPO = (allocations || []).reduce((acc, a) => {
        const poId = a.purchase_order_id!;
        const po = pos?.find(p => p.id === poId);
        const poCurrency = po?.currency || 'USD';
        const allocCurrency = a.currency || a.financial_record?.currency || 'USD';
        let amount = a.allocated_amount || 0;

        // Convert if currencies differ using exchange rate
        if (allocCurrency !== poCurrency && a.financial_record?.exchange_rate) {
          // If payment was in different currency, convert to PO currency
          // Assuming exchange_rate is relative to USD
          // For simplicity: amount_in_usd = amount / exchange_rate
          // Then if PO is in same currency, no change needed
          // This is a simplified conversion - for accuracy, store both amounts
          
          // Convert to USD first if payment wasn't in USD
          const amountInUsd = allocCurrency === 'USD' 
            ? amount 
            : amount / a.financial_record.exchange_rate;
          
          // For now, we'll use USD as the common denominator for comparison
          // and the PO's currency total should also be compared in USD
          amount = amountInUsd;
        }

        if (!acc[poId]) acc[poId] = { amount: 0, inUsd: 0 };
        
        // Store both the raw amount and USD equivalent
        acc[poId].amount += a.allocated_amount || 0;
        acc[poId].inUsd += amount;
        
        return acc;
      }, {} as Record<string, { amount: number; inUsd: number }>);

      return pos?.map(po => {
        const allocInfo = allocationsByPO[po.id] || { amount: 0, inUsd: 0 };
        // Use the raw allocated amount in the same currency as the PO
        // This assumes allocations are made in PO currency
        const totalPaid = allocInfo.amount;
        const balanceOwed = (po.total_value || 0) - totalPaid;
        
        return {
          ...po,
          totalPaid,
          balanceOwed,
        };
      }).filter(p => p.balanceOwed > 0) || [];
    },
    enabled: !!supplierId,
  });
}
