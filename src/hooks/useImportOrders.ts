import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ParsedOrderItem {
  productName: string;
  modelNumber: string;
  specifications: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierName: string;
  supplierId?: string | null;
  cartons: number;
  cbm: number;
  grossWeight: number;
}

export interface ParsedOrder {
  name: string;
  projectId: string;
  orderNumber: string;
  customerName: string;
  customerId?: string | null;
  createCustomer?: boolean;
  totalValue: number;
  currency: string;
  status: string;
  tradeTerm: string;
  deliveryTermStart?: string;
  deliveryTermEnd?: string;
  paymentTerms: string;
  notes: string;
  items: ParsedOrderItem[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { order: string; error: string }[];
}

interface ImportParams {
  orders: ParsedOrder[];
  onProgress?: (progress: number) => void;
}

async function generateOrderNumber(): Promise<string> {
  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].order_number;
    const match = lastNumber.match(/ORD-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `ORD-${nextNumber.toString().padStart(4, '0')}`;
}

async function createCustomerIfNeeded(customerName: string): Promise<string> {
  // Check if customer already exists
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .ilike('company_name', customerName)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({
      company_name: customerName,
      contact_person: customerName, // Will need to be updated later
      email: '', // Will need to be updated later
      status: 'active',
    })
    .select('id')
    .single();

  if (error) throw error;
  return newCustomer.id;
}

export function useImportOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orders, onProgress }: ImportParams): Promise<ImportResult> => {
      const results: ImportResult = { success: 0, failed: 0, errors: [] };
      const total = orders.length;
      let baseOrderNumber = 0;

      // Get base order number for sequential generation
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastOrder && lastOrder.length > 0) {
        const match = lastOrder[0].order_number.match(/ORD-(\d+)/);
        if (match) {
          baseOrderNumber = parseInt(match[1]);
        }
      }

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        
        try {
          // Get or create customer
          let customerId = order.customerId;
          if (!customerId && order.customerName) {
            if (order.createCustomer) {
              customerId = await createCustomerIfNeeded(order.customerName);
            } else {
              throw new Error(`No customer matched for "${order.customerName}"`);
            }
          }

          if (!customerId) {
            throw new Error('Customer ID is required');
          }

          // Generate sequential order number
          baseOrderNumber++;
          const orderNumber = `ORD-${baseOrderNumber.toString().padStart(4, '0')}`;

          // Create order
          const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
              order_number: orderNumber,
              customer_id: customerId,
              status: order.status || 'pending',
              total_value: order.totalValue,
              currency: order.currency || 'USD',
              trade_term: order.tradeTerm || 'FOB',
              delivery_term_start: order.deliveryTermStart,
              delivery_term_end: order.deliveryTermEnd,
              payment_terms: order.paymentTerms,
              notes: `${order.name}\n\n${order.notes || ''}`.trim(),
            })
            .select('id')
            .single();

          if (orderError) throw orderError;

          // Create order items
          if (order.items.length > 0) {
            const orderItems = order.items.map((item, index) => ({
              order_id: newOrder.id,
              product_name: item.productName,
              model_number: item.modelNumber || `ITEM-${index + 1}`,
              specifications: item.specifications,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.totalPrice || (item.quantity * item.unitPrice),
              supplier_id: item.supplierId,
              cartons: item.cartons || null,
              cbm: item.cbm || null,
              gross_weight_kg: item.grossWeight || null,
            }));

            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(orderItems);

            if (itemsError) throw itemsError;
          }

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            order: order.name || `Order ${i + 1}`,
            error: error.message || 'Unknown error',
          });
          console.error(`Failed to import order ${order.name}:`, error);
        }

        // Report progress
        if (onProgress) {
          onProgress(((i + 1) / total) * 100);
        }
      }

      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      if (data.failed > 0) {
        console.error('Import errors:', data.errors);
      }
    },
    onError: (error: any) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });
}
