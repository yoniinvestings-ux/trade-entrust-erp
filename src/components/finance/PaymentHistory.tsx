import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  DollarSign, Receipt, ExternalLink, ArrowUpRight, ArrowDownRight,
  CreditCard, Banknote, CheckCircle2, Trash2, Loader2
} from 'lucide-react';

interface PaymentHistoryProps {
  orderId?: string;
  purchaseOrderId?: string;
  type?: 'customer_payment' | 'supplier_payment';
}

const PAYMENT_METHOD_ICONS: Record<string, any> = {
  bank_transfer: Banknote,
  wire: Banknote,
  check: Receipt,
  credit_card: CreditCard,
  cash: DollarSign,
};

export function PaymentHistory({ orderId, purchaseOrderId, type }: PaymentHistoryProps) {
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', orderId, purchaseOrderId, type],
    queryFn: async () => {
      // Fetch direct payments on financial_records
      let directQuery = supabase
        .from('financial_records')
        .select('*')
        .order('date', { ascending: false });

      if (orderId) {
        directQuery = directQuery.eq('order_id', orderId);
      }
      if (purchaseOrderId) {
        directQuery = directQuery.eq('purchase_order_id', purchaseOrderId);
      }
      if (type) {
        directQuery = directQuery.eq('type', type);
      }

      const { data: directPayments, error: directError } = await directQuery;
      if (directError) throw directError;

      // Also fetch payments linked via payment_allocations
      let allocatedPayments: any[] = [];
      
      if (orderId) {
        const { data: allocations, error: allocError } = await supabase
          .from('payment_allocations')
          .select(`
            id,
            allocated_amount,
            currency,
            financial_record:financial_records(*)
          `)
          .eq('order_id', orderId);
        
        if (!allocError && allocations) {
          allocatedPayments = allocations
            .filter(a => a.financial_record)
            .map(a => ({
              ...a.financial_record,
              allocation_id: a.id,
              allocated_amount: a.allocated_amount,
              allocation_currency: a.currency,
              is_allocation: true,
            }));
        }
      }

      if (purchaseOrderId) {
        const { data: allocations, error: allocError } = await supabase
          .from('payment_allocations')
          .select(`
            id,
            allocated_amount,
            currency,
            financial_record:financial_records(*)
          `)
          .eq('purchase_order_id', purchaseOrderId);
        
        if (!allocError && allocations) {
          allocatedPayments = allocations
            .filter(a => a.financial_record)
            .map(a => ({
              ...a.financial_record,
              allocation_id: a.id,
              allocated_amount: a.allocated_amount,
              allocation_currency: a.currency,
              is_allocation: true,
            }));
        }
      }

      // Combine and deduplicate (prefer allocation records)
      const directIds = new Set((directPayments || []).map(p => p.id));
      const combined = [
        ...(directPayments || []),
        ...allocatedPayments.filter(p => !directIds.has(p.id)),
      ];

      // Sort by date descending
      return combined.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    enabled: !!(orderId || purchaseOrderId),
  });

  // Delete/Cancel payment mutation
  const deletePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Get payment allocations for this financial record
      const { data: allocations } = await supabase
        .from('payment_allocations')
        .select('*')
        .eq('financial_record_id', paymentId);

      // 2. Reverse PO deposit amounts for each allocation
      for (const alloc of allocations || []) {
        if (alloc.purchase_order_id) {
          const { data: po } = await supabase
            .from('purchase_orders')
            .select('factory_deposit_amount, po_number')
            .eq('id', alloc.purchase_order_id)
            .single();

          const newAmount = Math.max(0, (po?.factory_deposit_amount || 0) - alloc.allocated_amount);
          
          await supabase
            .from('purchase_orders')
            .update({
              factory_deposit_amount: newAmount,
            })
            .eq('id', alloc.purchase_order_id);

          // Log cancellation activity
          await supabase.from('activity_logs').insert({
            action: 'payment_cancelled',
            collection: 'purchase_order',
            document_id: alloc.purchase_order_id,
            performed_by: user?.id || null,
            performed_by_email: user?.email || null,
            changes: {
              cancelled_amount: alloc.allocated_amount,
              currency: alloc.currency,
            },
            metadata: {
              financial_record_id: paymentId,
              po_number: po?.po_number,
            },
          });
        }

        if (alloc.order_id) {
          // Log cancellation activity for orders
          await supabase.from('activity_logs').insert({
            action: 'payment_cancelled',
            collection: 'order',
            document_id: alloc.order_id,
            performed_by: user?.id || null,
            performed_by_email: user?.email || null,
            changes: {
              cancelled_amount: alloc.allocated_amount,
              currency: alloc.currency,
            },
            metadata: {
              financial_record_id: paymentId,
            },
          });
        }
      }

      // 3. Delete payment allocations
      await supabase
        .from('payment_allocations')
        .delete()
        .eq('financial_record_id', paymentId);

      // 4. Mark financial record as void (keep for audit trail)
      await supabase
        .from('financial_records')
        .update({ 
          status: 'void',
          notes: `Cancelled on ${format(new Date(), 'yyyy-MM-dd HH:mm')}`
        })
        .eq('id', paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
      queryClient.invalidateQueries({ queryKey: ['payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['order-activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-supplier-pos'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-customer-orders'] });
      toast.success('Payment cancelled successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to cancel payment: ' + error.message);
    },
  });

  const formatCurrency = (value: number, currency: string = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(value);
    } catch {
      return `${currency} ${value.toLocaleString()}`;
    }
  };

  const getPurposeLabel = (purpose: string | null) => {
    const labels: Record<string, string> = {
      deposit: 'Deposit',
      balance: 'Balance',
      full: 'Full Payment',
      customer_deposit: 'Customer Deposit',
      factory_deposit: 'Factory Deposit',
    };
    return labels[purpose || 'full'] || purpose;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No payments recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => {
        const MethodIcon = PAYMENT_METHOD_ICONS[payment.payment_method || ''] || DollarSign;
        const isIncoming = payment.type === 'customer_payment';
        const displayAmount = payment.is_allocation ? payment.allocated_amount : payment.amount;
        const displayCurrency = payment.is_allocation ? (payment.allocation_currency || payment.currency) : payment.currency;
        const isVoid = payment.status === 'void';

        return (
          <div
            key={payment.is_allocation ? `alloc-${payment.allocation_id}` : payment.id}
            className={`flex items-center justify-between p-4 border rounded-lg bg-card ${isVoid ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${isIncoming ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {isIncoming ? (
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getPurposeLabel(payment.purpose)}</span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {(payment.payment_method || 'unknown').replace('_', ' ')}
                  </Badge>
                  {payment.is_allocation && (
                    <Badge variant="outline" className="text-xs">Allocated</Badge>
                  )}
                  {isVoid ? (
                    <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                  ) : payment.status === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                  {payment.reference_number && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-xs">{payment.reference_number}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`font-bold ${isVoid ? 'line-through text-muted-foreground' : isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                  {isIncoming ? '+' : '-'}{formatCurrency(displayAmount, displayCurrency || 'USD')}
                </p>
                {payment.exchange_rate && payment.exchange_rate !== 1 && (
                  <p className="text-xs text-muted-foreground">
                    ≈ ${(displayAmount / payment.exchange_rate).toFixed(2)} USD
                  </p>
                )}
              </div>
              {payment.receipt_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(payment.receipt_url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              {!isVoid && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Payment</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the payment as cancelled and reverse any allocations. 
                        PO deposit amounts will be reduced accordingly.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Payment</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePayment.mutate(payment.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deletePayment.isPending}
                      >
                        {deletePayment.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Cancel Payment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
