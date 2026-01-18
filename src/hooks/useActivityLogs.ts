import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface ActivityLog {
  id: string;
  action: string;
  collection: string;
  document_id: string;
  performed_by: string | null;
  performed_by_email: string | null;
  changes: Json | null;
  metadata: Json | null;
  timestamp: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

// Fetch activity logs for an entity (order or PO)
export function useEntityActivityLogs(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['activity-logs', entityType, entityId],
    queryFn: async (): Promise<ActivityLog[]> => {
      // Fetch activity logs for the specific entity
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('collection', entityType)
        .eq('document_id', entityId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      // Fetch author profiles
      const authorIds = [...new Set(logs.filter(l => l.performed_by).map(l => l.performed_by!))];
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', authorIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

        return logs.map(log => ({
          ...log,
          profile: log.performed_by ? profileMap.get(log.performed_by) : undefined,
        }));
      }

      return logs;
    },
    enabled: !!entityType && !!entityId,
  });
}

// Fetch combined activity for a PO (including related order activity)
export function usePOActivityTimeline(poId: string, orderId?: string) {
  return useQuery({
    queryKey: ['po-activity-timeline', poId, orderId],
    queryFn: async () => {
      const activities: Array<{
        type: 'log' | 'payment' | 'qc' | 'update' | 'wecom';
        timestamp: string;
        data: Record<string, unknown>;
      }> = [];

      // Fetch activity logs for PO
      const { data: poLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('collection', 'purchase_order')
        .eq('document_id', poId)
        .order('timestamp', { ascending: false });

      poLogs?.forEach(log => {
        activities.push({
          type: 'log',
          timestamp: log.timestamp,
          data: { ...log, source: 'purchase_order' }
        });
      });

      // Fetch payments for this PO - both direct and via payment_allocations
      const { data: directPayments } = await supabase
        .from('financial_records')
        .select('*')
        .eq('purchase_order_id', poId)
        .order('date', { ascending: false });

      directPayments?.forEach(payment => {
        activities.push({
          type: 'payment',
          timestamp: payment.date,
          data: { ...payment }
        });
      });

      // Also fetch payments linked via payment_allocations
      const { data: allocations } = await supabase
        .from('payment_allocations')
        .select(`
          id,
          allocated_amount,
          currency,
          financial_record:financial_records(*)
        `)
        .eq('purchase_order_id', poId);

      const directPaymentIds = new Set(directPayments?.map(p => p.id) || []);
      
      allocations?.forEach(alloc => {
        // Only add if not already included as a direct payment
        if (alloc.financial_record && !directPaymentIds.has((alloc.financial_record as any).id)) {
          activities.push({
            type: 'payment',
            timestamp: (alloc.financial_record as any).date,
            data: { 
              ...(alloc.financial_record as any),
              allocated_amount: alloc.allocated_amount,
              allocation_currency: alloc.currency,
              is_allocation: true 
            }
          });
        }
      });

      // Fetch QC inspections
      const { data: qcInspections } = await supabase
        .from('qc_inspections')
        .select('id, inspection_date, status, inspection_type, conclusion')
        .eq('po_id', poId);

      qcInspections?.forEach(qc => {
        activities.push({
          type: 'qc',
          timestamp: qc.inspection_date,
          data: { ...qc }
        });
      });

      // Fetch WeCom messages
      const { data: wecomMessages } = await supabase
        .from('wecom_messages')
        .select('*')
        .eq('entity_type', 'purchase_order')
        .eq('entity_id', poId)
        .order('created_at', { ascending: false });

      wecomMessages?.forEach(msg => {
        activities.push({
          type: 'wecom',
          timestamp: msg.created_at,
          data: { ...msg }
        });
      });

      // Sort by timestamp desc
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities;
    },
    enabled: !!poId,
  });
}

// Fetch combined activity for an Order (including all POs)
export function useOrderActivityTimeline(orderId: string) {
  return useQuery({
    queryKey: ['order-activity-timeline', orderId],
    queryFn: async () => {
      const activities: Array<{
        type: 'log' | 'payment' | 'qc' | 'update' | 'wecom' | 'po';
        timestamp: string;
        data: Record<string, unknown>;
      }> = [];

      // Fetch activity logs for order
      const { data: orderLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('collection', 'order')
        .eq('document_id', orderId)
        .order('timestamp', { ascending: false });

      orderLogs?.forEach(log => {
        activities.push({
          type: 'log',
          timestamp: log.timestamp,
          data: { ...log, source: 'order' }
        });
      });

      // Fetch customer payments
      const { data: customerPayments } = await supabase
        .from('financial_records')
        .select('*')
        .eq('order_id', orderId)
        .eq('type', 'customer_payment')
        .order('date', { ascending: false });

      customerPayments?.forEach(payment => {
        activities.push({
          type: 'payment',
          timestamp: payment.date,
          data: { ...payment, source: 'customer' }
        });
      });

      // Fetch POs for this order
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, created_at, factory_confirmed_at, production_started_at, production_completed_at, shipped_at, qc_completed_at, supplier:suppliers(supplier_name)')
        .eq('order_id', orderId);

      pos?.forEach(po => {
        // Add PO creation
        activities.push({
          type: 'po',
          timestamp: po.created_at,
          data: { action: 'created', po_number: po.po_number, supplier: po.supplier }
        });

        // Add PO milestones
        if (po.factory_confirmed_at) {
          activities.push({
            type: 'po',
            timestamp: po.factory_confirmed_at,
            data: { action: 'confirmed', po_number: po.po_number, supplier: po.supplier }
          });
        }
        if (po.production_started_at) {
          activities.push({
            type: 'po',
            timestamp: po.production_started_at,
            data: { action: 'production_started', po_number: po.po_number, supplier: po.supplier }
          });
        }
        if (po.production_completed_at) {
          activities.push({
            type: 'po',
            timestamp: po.production_completed_at,
            data: { action: 'production_completed', po_number: po.po_number, supplier: po.supplier }
          });
        }
        if (po.qc_completed_at) {
          activities.push({
            type: 'po',
            timestamp: po.qc_completed_at,
            data: { action: 'qc_completed', po_number: po.po_number, supplier: po.supplier }
          });
        }
        if (po.shipped_at) {
          activities.push({
            type: 'po',
            timestamp: po.shipped_at,
            data: { action: 'shipped', po_number: po.po_number, supplier: po.supplier }
          });
        }
      });

      const poIds = pos?.map(po => po.id) || [];

      // Fetch supplier payments for all POs
      if (poIds.length > 0) {
        const { data: supplierPayments } = await supabase
          .from('financial_records')
          .select('*, purchase_orders(po_number)')
          .in('purchase_order_id', poIds)
          .eq('type', 'supplier_payment')
          .order('date', { ascending: false });

        supplierPayments?.forEach(payment => {
          activities.push({
            type: 'payment',
            timestamp: payment.date,
            data: { ...payment, source: 'supplier' }
          });
        });

        // Fetch QC inspections for all POs
        const { data: qcInspections } = await supabase
          .from('qc_inspections')
          .select('*')
          .or(`order_id.eq.${orderId},po_id.in.(${poIds.join(',')})`);

        qcInspections?.forEach(qc => {
          activities.push({
            type: 'qc',
            timestamp: qc.inspection_date || qc.created_at,
            data: { ...qc }
          });
        });
      }

      // Sort by timestamp desc
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities;
    },
    enabled: !!orderId,
  });
}

// Log an activity
export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      action: string;
      collection: string;
      documentId: string;
      changes?: Json;
      metadata?: Json;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('activity_logs').insert([{
        action: params.action,
        collection: params.collection,
        document_id: params.documentId,
        performed_by: user?.id,
        performed_by_email: user?.email,
        changes: params.changes,
        metadata: params.metadata,
      }]);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs', variables.collection, variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['po-activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['order-activity-timeline'] });
    },
  });
}
