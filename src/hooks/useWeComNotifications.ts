import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WeComMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  entity_type: string | null;
  entity_id: string | null;
  supplier_id: string | null;
  message_type: string;
  content: string;
  status: string | null;
  wecom_message_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  parsed_action: string | null;
  parsed_data: Record<string, unknown> | null;
  processed_at: string | null;
  entity_update_id: string | null;
  wecom_response: Record<string, unknown> | null;
  retry_count: number | null;
}

export interface WeComSettings {
  wecom_webhook_url: string | null;
  wecom_webhook_token: string | null;
  wecom_integration_status: string | null;
  wecom_last_test: string | null;
  wecom_error_count: number | null;
  wecom_last_error: string | null;
}

// Test WeCom webhook connection
export function useTestWeComWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierId: string) => {
      const { data, error } = await supabase.functions.invoke('wecom-send', {
        body: {
          supplier_id: supplierId,
          message_type: 'test'
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.wecom_response?.errmsg || 'Failed to send test message');
      
      return data;
    },
    onSuccess: (_, supplierId) => {
      toast.success('WeCom连接测试成功！');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['wecom-messages', supplierId] });
    },
    onError: (error) => {
      toast.error(`连接测试失败: ${error.message}`);
    }
  });
}

// All available WeCom message types
export type WeComMessageType = 
  | 'po_created' 
  | 'po_updated' 
  | 'payment_sent' 
  | 'document_shared' 
  | 'general'
  | 'test'
  // Automated push notification types
  | 'production_reminder'
  | 'production_start_reminder'
  | 'production_progress_check'
  | 'production_deadline_warning'
  | 'production_overdue'
  | 'qc_scheduled'
  | 'shipping_reminder'
  | 'request_shipping_docs';

// Send PO notification to WeCom
export function useSendPOToWeCom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      supplierId, 
      poId, 
      messageType = 'po_created',
      content,
      metadata
    }: { 
      supplierId: string;
      poId: string;
      messageType?: WeComMessageType;
      content?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke('wecom-send', {
        body: {
          supplier_id: supplierId,
          message_type: messageType,
          entity_type: 'purchase_order',
          entity_id: poId,
          content,
          metadata
        }
      });

      if (error) throw error;
      if (!data.success) {
        throw new Error(data.error_message || data.wecom_response?.errmsg || 'Failed to send message');
      }
      
      return data;
    },
    onSuccess: (_, { supplierId, poId }) => {
      toast.success('消息已发送到企业微信');
      queryClient.invalidateQueries({ queryKey: ['wecom-messages', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['wecom-messages-po', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
    },
    onError: (error) => {
      toast.error(`发送失败: ${error.message}`);
    }
  });
}

// Get WeCom messages for a supplier
export function useWeComMessages(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['wecom-messages', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];

      const { data, error } = await supabase
        .from('wecom_messages')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WeComMessage[];
    },
    enabled: !!supplierId
  });
}

// Get WeCom messages for a specific PO
export function usePOWeComMessages(poId: string | undefined) {
  return useQuery({
    queryKey: ['wecom-messages-po', poId],
    queryFn: async () => {
      if (!poId) return [];

      const { data, error } = await supabase
        .from('wecom_messages')
        .select('*')
        .eq('entity_type', 'purchase_order')
        .eq('entity_id', poId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WeComMessage[];
    },
    enabled: !!poId
  });
}

// Update WeCom settings for a supplier
export function useUpdateWeComSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      supplierId, 
      webhookUrl 
    }: { 
      supplierId: string;
      webhookUrl: string;
    }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          wecom_webhook_url: webhookUrl,
          wecom_integration_status: webhookUrl ? 'testing' : 'not_setup',
          wecom_error_count: 0,
          wecom_last_error: null
        })
        .eq('id', supplierId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { supplierId }) => {
      toast.success('企业微信设置已更新');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] });
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    }
  });
}

// Get WeCom settings for a supplier
export function useSupplierWeComSettings(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-wecom-settings', supplierId],
    queryFn: async () => {
      if (!supplierId) return null;

      const { data, error } = await supabase
        .from('suppliers')
        .select('wecom_webhook_url, wecom_webhook_token, wecom_integration_status, wecom_last_test, wecom_error_count, wecom_last_error')
        .eq('id', supplierId)
        .single();

      if (error) throw error;
      return data as WeComSettings;
    },
    enabled: !!supplierId
  });
}