import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  order_item_id: string | null;
  product_name: string;
  product_name_cn: string | null;
  model_number: string;
  specifications: string | null;
  specifications_cn: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  remarks: string | null;
  created_at: string;
}

export function usePurchaseOrderItems(poId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-order-items', poId],
    queryFn: async () => {
      if (!poId) return [];

      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', poId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PurchaseOrderItem[];
    },
    enabled: !!poId,
  });
}

export function useSavePurchaseOrderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poId,
      items,
    }: {
      poId: string;
      items: Omit<PurchaseOrderItem, 'id' | 'created_at' | 'total_price'>[];
    }) => {
      // First, delete existing items for this PO
      const { error: deleteError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', poId);

      if (deleteError) throw deleteError;

      // If no items to insert, we're done
      if (items.length === 0) return [];

      // Insert new items
      const itemsToInsert = items.map((item) => ({
        purchase_order_id: poId,
        order_item_id: item.order_item_id || null,
        product_name: item.product_name,
        product_name_cn: item.product_name_cn || null,
        model_number: item.model_number,
        specifications: item.specifications || null,
        specifications_cn: item.specifications_cn || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        remarks: item.remarks || null,
      }));

      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-items', variables.poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.poId] });
    },
    onError: (error) => {
      toast.error('Failed to save PO items: ' + error.message);
    },
  });
}

// Get ALL order items for selection when creating a new PO (no supplier filter)
export function useOrderItems(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-items-for-po', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from('order_items')
        .select('*, product_photos(*)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}

// Get order items filtered by supplier for creating a new PO (legacy - kept for backward compatibility)
export function useOrderItemsBySupplier(orderId: string | undefined, supplierId: string | undefined) {
  return useQuery({
    queryKey: ['order-items-by-supplier', orderId, supplierId],
    queryFn: async () => {
      if (!orderId) return [];

      let query = supabase
        .from('order_items')
        .select('*, product_photos(*)')
        .eq('order_id', orderId);

      // If supplier is provided, filter by it
      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}
