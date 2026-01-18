import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedDocument {
  id: string;
  document_type: string;
  document_number: string;
  order_id: string | null;
  purchase_order_id: string | null;
  file_url: string | null;
  generated_at: string;
  generated_by: string | null;
  metadata: Record<string, unknown> | null;
}

type DocumentInsert = {
  document_type: string;
  document_number: string;
  order_id?: string | null;
  purchase_order_id?: string | null;
  file_url?: string | null;
  generated_by?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function useGeneratedDocuments(orderId?: string, purchaseOrderId?: string) {
  return useQuery({
    queryKey: ['generated-documents', orderId, purchaseOrderId],
    queryFn: async () => {
      let query = supabase.from('generated_documents').select('*');
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      if (purchaseOrderId) {
        query = query.eq('purchase_order_id', purchaseOrderId);
      }
      
      const { data, error } = await query.order('generated_at', { ascending: false });

      if (error) throw error;
      return data as GeneratedDocument[];
    },
    enabled: !!(orderId || purchaseOrderId),
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: DocumentInsert) => {
      const { data, error } = await supabase
        .from('generated_documents')
        .insert([document as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['generated-documents'] });
      toast.success(`${data.document_type} generated successfully`);
    },
    onError: (error) => {
      toast.error('Failed to generate document: ' + error.message);
    },
  });
}

export function generateDocumentNumber(type: 'PI' | 'CI' | 'PL' | 'PO' | 'QC', existingNumber?: string): string {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  switch (type) {
    case 'PI':
      return existingNumber ? existingNumber.replace('ORD', 'PI') : `PI-${year}${month}${day}-${random}`;
    case 'CI':
      return existingNumber ? existingNumber.replace('ORD', 'CI').replace('PI', 'CI') : `CI-${year}${month}${day}-${random}`;
    case 'PL':
      return existingNumber ? existingNumber.replace('ORD', 'PL').replace('PI', 'PL') : `PL-${year}${month}${day}-${random}`;
    case 'PO':
      return existingNumber || `PO-${year}${month}${day}-${random}`;
    case 'QC':
      return existingNumber ? existingNumber.replace('ORD', 'QC').replace('PI', 'QC') : `QC-${year}${month}${day}-${random}`;
    default:
      return `DOC-${year}${month}${day}-${random}`;
  }
}
