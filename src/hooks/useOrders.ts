import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Order = Tables<'orders'> & {
  customer?: Tables<'customers'>;
  order_items?: (Tables<'order_items'> & {
    product_photos?: Tables<'product_photos'>[];
  })[];
  purchase_orders?: Tables<'purchase_orders'>[];
  sourcing_project?: { id: string; project_title: string } | null;
};

export type OrderItem = Tables<'order_items'>;
export type OrderItemInsert = TablesInsert<'order_items'>;

export interface PhotoData {
  id: string;
  url: string;
  file_name: string;
  is_main: boolean;
  photo_type?: 'customer' | 'factory';
}

export function useOrders(filters?: {
  status?: string;
  customerId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, company_name, contact_person, email),
          order_items(*, product_photos(*)),
          purchase_orders(id, po_number, total_value, status),
          sourcing_project:sourcing_projects(id, project_title)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.search) {
        query = query.or(`order_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
  });
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          order_items(*, product_photos(*)),
          purchase_orders(*, supplier:suppliers(id, supplier_name, contact_person)),
          sourcing_project:sourcing_projects(id, project_title)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as Order;
    },
    enabled: !!orderId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: Omit<TablesInsert<'orders'>, 'order_number'> & {
      items?: OrderItemInsert[];
      itemPhotos?: Record<number, PhotoData[]>;
    }) => {
      // Generate order number
      const { data: orderNumber, error: numError } = await supabase
        .rpc('generate_order_number');
      
      if (numError) throw numError;

      const { items, itemPhotos, ...orderData } = order;
      
      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({ ...orderData, order_number: orderNumber })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items if provided and get their IDs
      if (items && items.length > 0) {
        // Exclude 'id' field from insert - let DB generate it
        const itemsWithOrderId = items.map(({ id, ...item }) => ({
          ...item,
          order_id: newOrder.id,
          total_price: (item.quantity || 1) * (item.unit_price || 0),
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId)
          .select('id');

        if (itemsError) throw itemsError;

        // Insert photos for each item if provided
        if (itemPhotos && insertedItems && insertedItems.length > 0) {
          const photoRecords: TablesInsert<'product_photos'>[] = [];
          
          insertedItems.forEach((item, index) => {
            const photos = itemPhotos[index];
            if (photos && photos.length > 0) {
              photos.forEach(photo => {
                photoRecords.push({
                  order_item_id: item.id,
                  url: photo.url,
                  file_name: photo.file_name,
                  is_main: photo.is_main,
                  photo_type: photo.photo_type || 'customer',
                });
              });
            }
          });

          if (photoRecords.length > 0) {
            const { error: photoError } = await supabase
              .from('product_photos')
              .insert(photoRecords);

            if (photoError) {
              console.error('Failed to save photos:', photoError);
              // Don't throw - order was created, just log the photo error
              toast.error('Order saved but some photos failed to save');
            }
          }
        }
      }

      return newOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      items, 
      itemPhotos,
      ...updates 
    }: TablesUpdate<'orders'> & { 
      id: string;
      items?: (OrderItemInsert & { id?: string })[];
      itemPhotos?: Record<number, PhotoData[]>;
    }) => {
      // Update order
      const { data, error } = await supabase
        .from('orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Handle items if provided - use smart upsert approach
      if (items) {
        // Get existing items
        const { data: existingItems } = await supabase
          .from('order_items')
          .select('id')
          .eq('order_id', id);

        const existingItemIds = new Set(existingItems?.map(i => i.id) || []);
        const submittedItemIds = new Set(items.filter(i => i.id).map(i => i.id!));

        // Items to delete (existed before but not in submission)
        const itemsToDelete = [...existingItemIds].filter(itemId => !submittedItemIds.has(itemId));
        
        // Delete removed items and their photos
        if (itemsToDelete.length > 0) {
          // Delete photos first
          await supabase
            .from('product_photos')
            .delete()
            .in('order_item_id', itemsToDelete);
          
          // Then delete items
          await supabase
            .from('order_items')
            .delete()
            .in('id', itemsToDelete);
        }

        // Separate items to update vs insert
        const itemsToUpdate = items.filter(item => item.id && existingItemIds.has(item.id));
        const itemsToInsert = items.filter(item => !item.id || !existingItemIds.has(item.id));

        // Update existing items
        for (const item of itemsToUpdate) {
          const { id: itemId, ...itemData } = item;
          await supabase
            .from('order_items')
            .update({
              ...itemData,
              total_price: (item.quantity || 1) * (item.unit_price || 0),
            })
            .eq('id', itemId!);
        }

        // Insert new items
        let newItemIds: string[] = [];
        if (itemsToInsert.length > 0) {
          const newItemsWithOrderId = itemsToInsert.map(({ id: itemId, ...item }) => ({
            ...item,
            order_id: id,
            total_price: (item.quantity || 1) * (item.unit_price || 0),
          }));

          const { data: insertedItems, error: insertError } = await supabase
            .from('order_items')
            .insert(newItemsWithOrderId)
            .select('id');

          if (insertError) throw insertError;
          newItemIds = insertedItems?.map(i => i.id) || [];
        }

        // Handle photos for all items
        if (itemPhotos) {
          // Build a mapping: index in items array -> actual item ID
          const indexToItemId: Record<number, string> = {};
          let newItemIndex = 0;
          
          items.forEach((item, index) => {
            if (item.id && existingItemIds.has(item.id)) {
              // Existing item - use its ID
              indexToItemId[index] = item.id;
            } else {
              // New item - use ID from insertion
              if (newItemIndex < newItemIds.length) {
                indexToItemId[index] = newItemIds[newItemIndex];
                newItemIndex++;
              }
            }
          });

          // For each item with photos, delete old photos and insert new ones
          for (const [indexStr, photos] of Object.entries(itemPhotos)) {
            const index = parseInt(indexStr);
            const itemId = indexToItemId[index];
            
            if (!itemId) continue;

            // Delete existing photos for this item
            await supabase
              .from('product_photos')
              .delete()
              .eq('order_item_id', itemId);

            // Insert new photos
            if (photos && photos.length > 0) {
              const photoRecords: TablesInsert<'product_photos'>[] = photos.map(photo => ({
                order_item_id: itemId,
                url: photo.url,
                file_name: photo.file_name,
                is_main: photo.is_main,
                photo_type: photo.photo_type || 'customer',
              }));

              const { error: photoError } = await supabase
                .from('product_photos')
                .insert(photoRecords);

              if (photoError) {
                console.error('Failed to save photos for item:', itemId, photoError);
              }
            }
          }
        }

        // Recalculate total value
        const totalValue = items.reduce((sum, item) => 
          sum + ((item.quantity || 1) * (item.unit_price || 0)), 0
        );

        await supabase
          .from('orders')
          .update({ total_value: totalValue })
          .eq('id', id);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
      toast.success('Order updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete order: ' + error.message);
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .order('company_name');

      if (error) throw error;
      return data;
    },
  });
}
