import { useState } from 'react';
import { FileText, Receipt, Package, FileCheck, Calendar, Download, Eye, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useGeneratedDocuments } from '@/hooks/useDocuments';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DocumentHistoryProps {
  orderId?: string;
  purchaseOrderId?: string;
}

const DOCUMENT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PI: FileText,
  CI: Receipt,
  PL: Package,
  FACTORY_PO: FileCheck,
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PI: 'Proforma Invoice',
  CI: 'Commercial Invoice',
  PL: 'Packing List',
  FACTORY_PO: 'Factory Purchase Order',
};

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  PI: 'bg-blue-500/10 text-blue-600',
  CI: 'bg-green-500/10 text-green-600',
  PL: 'bg-orange-500/10 text-orange-600',
  FACTORY_PO: 'bg-purple-500/10 text-purple-600',
};

export function DocumentHistory({ orderId, purchaseOrderId }: DocumentHistoryProps) {
  const { data: documents, isLoading } = useGeneratedDocuments(orderId, purchaseOrderId);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteDocument = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('generated_documents')
        .delete()
        .eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-documents'] });
      toast.success('Document deleted');
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error('Failed to delete document: ' + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents generated"
        description="Documents you generate will appear here for easy access and reference."
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map((doc) => {
          const Icon = DOCUMENT_TYPE_ICONS[doc.document_type] || FileText;
          const label = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
          const colorClass = DOCUMENT_TYPE_COLORS[doc.document_type] || 'bg-muted text-muted-foreground';

          return (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{label}</p>
                    <Badge variant="outline" className="font-mono text-xs">
                      {doc.document_number}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(doc.generated_at), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.file_url && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.file_url!, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <a
                      href={doc.file_url}
                      download
                      className="inline-flex items-center justify-center h-9 px-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteDocument.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteDocument.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
