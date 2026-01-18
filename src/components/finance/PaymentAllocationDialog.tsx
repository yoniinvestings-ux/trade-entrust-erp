import { useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Upload, Loader2, X, Receipt, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useUnpaidCustomerOrders, useUnpaidSupplierPOs } from '@/hooks/usePaymentAllocations';
import { useSuppliers } from '@/hooks/usePurchaseOrders';

interface PaymentAllocationDialogProps {
  type: 'customer_payment' | 'supplier_payment';
  onSuccess?: () => void;
  children?: React.ReactNode;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'alipay', label: 'Alipay' },
  { value: 'wechat_pay', label: 'WeChat Pay' },
];

interface AllocationEntry {
  id: string;
  number: string;
  totalValue: number;
  totalPaid: number;
  balanceDue: number;
  currency: string;
  allocateAmount: number;
  selected: boolean;
}

export function PaymentAllocationDialog({
  type,
  onSuccess,
  children,
}: PaymentAllocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [allocations, setAllocations] = useState<AllocationEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    currency: 'USD',
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    exchange_rate: 1,
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name');
      if (error) throw error;
      return data;
    },
    enabled: type === 'customer_payment' && open,
  });

  // Fetch suppliers
  const { data: suppliers } = useSuppliers();

  // Fetch unpaid orders/POs based on selection
  const { data: unpaidOrders } = useUnpaidCustomerOrders(
    type === 'customer_payment' ? selectedEntityId : undefined
  );
  const { data: unpaidPOs } = useUnpaidSupplierPOs(
    type === 'supplier_payment' ? selectedEntityId : undefined
  );

  // Update allocations when unpaid items change
  const items = type === 'customer_payment' ? unpaidOrders : unpaidPOs;
  
  useMemo(() => {
    if (items && items.length > 0) {
      setAllocations(items.map(item => ({
        id: item.id,
        number: type === 'customer_payment' ? (item as any).order_number : (item as any).po_number,
        totalValue: item.total_value || 0,
        totalPaid: item.totalPaid || 0,
        balanceDue: type === 'customer_payment' 
          ? (item as any).balanceDue || 0 
          : (item as any).balanceOwed || 0,
        currency: item.currency || 'USD',
        allocateAmount: 0,
        selected: false,
      })));
    } else {
      setAllocations([]);
    }
  }, [items, type]);

  const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocateAmount || 0), 0);

  const resetForm = () => {
    setSelectedEntityId('');
    setAllocations([]);
    setFormData({
      currency: 'USD',
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      exchange_rate: 1,
    });
    setReceiptUrl(null);
    setReceiptFileName(null);
  };

  const uploadReceipt = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `receipts/allocations/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-photos')
      .getPublicUrl(filePath);

    return { url: publicUrl, fileName: file.name };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url, fileName } = await uploadReceipt(file);
      setReceiptUrl(url);
      setReceiptFileName(fileName);
      toast.success('Receipt uploaded');
    } catch (error: any) {
      toast.error('Failed to upload receipt: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeReceipt = () => {
    setReceiptUrl(null);
    setReceiptFileName(null);
  };

  const updateAllocation = (id: string, amount: number) => {
    setAllocations(prev => prev.map(a => 
      a.id === id 
        ? { ...a, allocateAmount: Math.min(amount, a.balanceDue), selected: amount > 0 }
        : a
    ));
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setAllocations(prev => prev.map(a => 
      a.id === id 
        ? { ...a, selected: checked, allocateAmount: checked ? a.balanceDue : 0 }
        : a
    ));
  };

  const createPaymentWithAllocations = useMutation({
    mutationFn: async () => {
      const selectedAllocations = allocations.filter(a => a.allocateAmount > 0);
      
      if (selectedAllocations.length === 0) {
        throw new Error('No allocations specified');
      }

      // Get current user for activity logging
      const { data: { user } } = await supabase.auth.getUser();

      // For single PO allocation, link directly to the PO
      const singlePOId = type === 'supplier_payment' && selectedAllocations.length === 1 
        ? selectedAllocations[0].id 
        : null;
      const singleOrderId = type === 'customer_payment' && selectedAllocations.length === 1 
        ? selectedAllocations[0].id 
        : null;

      // Create the main financial record
      const { data: record, error: recordError } = await supabase
        .from('financial_records')
        .insert({
          type,
          customer_id: type === 'customer_payment' ? selectedEntityId : null,
          supplier_id: type === 'supplier_payment' ? selectedEntityId : null,
          purchase_order_id: singlePOId,
          order_id: singleOrderId,
          amount: totalAllocated,
          currency: formData.currency,
          payment_method: formData.payment_method,
          reference_number: formData.reference_number || null,
          notes: formData.notes || null,
          date: new Date(formData.date).toISOString(),
          receipt_url: receiptUrl,
          status: 'completed',
          purpose: type === 'customer_payment' ? 'customer_deposit' : 'factory_deposit',
          exchange_rate: formData.exchange_rate !== 1 ? formData.exchange_rate : null,
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // Create payment allocations
      const allocationInserts = selectedAllocations.map(a => ({
        financial_record_id: record.id,
        order_id: type === 'customer_payment' ? a.id : null,
        purchase_order_id: type === 'supplier_payment' ? a.id : null,
        allocated_amount: a.allocateAmount,
        currency: formData.currency,
      }));

      const { error: allocError } = await supabase
        .from('payment_allocations')
        .insert(allocationInserts);

      if (allocError) throw allocError;

      // Update PO payment tracking fields and log activity for supplier payments
      if (type === 'supplier_payment') {
        for (const alloc of selectedAllocations) {
          // Get current PO deposit/balance amounts and currency
          const { data: currentPO } = await supabase
            .from('purchase_orders')
            .select('factory_deposit_amount, factory_balance_amount, po_number, currency, supplier_id')
            .eq('id', alloc.id)
            .single();

          // Convert to PO currency if different
          let depositInPOCurrency = alloc.allocateAmount;
          if (formData.currency !== (currentPO?.currency || 'USD') && formData.exchange_rate && formData.exchange_rate !== 1) {
            // Convert payment currency to USD first, then to PO currency if needed
            depositInPOCurrency = alloc.allocateAmount / formData.exchange_rate;
          }

          // Update PO with new deposit amount
          const { error: updateError } = await supabase
            .from('purchase_orders')
            .update({
              factory_deposit_amount: (currentPO?.factory_deposit_amount || 0) + depositInPOCurrency,
              factory_deposit_paid_at: new Date().toISOString(),
            })
            .eq('id', alloc.id);

          if (updateError) {
            console.error('Failed to update PO deposit:', updateError);
          }

          // Log activity with correct collection name
          await supabase.from('activity_logs').insert({
            action: 'payment_allocated',
            collection: 'purchase_order', // Singular to match usePOActivityTimeline
            document_id: alloc.id,
            performed_by: user?.id || null,
            performed_by_email: user?.email || null,
            changes: {
              allocated_amount: alloc.allocateAmount,
              currency: formData.currency,
              payment_method: formData.payment_method,
              reference_number: formData.reference_number,
            },
            metadata: {
              financial_record_id: record.id,
              po_number: currentPO?.po_number,
            },
          });

          // Send WeCom notification with payment details
          if (currentPO?.supplier_id) {
            try {
              await supabase.functions.invoke('wecom-send', {
                body: {
                  supplier_id: currentPO.supplier_id,
                  message_type: 'payment_sent',
                  entity_type: 'purchase_order',
                  entity_id: alloc.id,
                  metadata: {
                    amount: alloc.allocateAmount,
                    currency: formData.currency,
                    payment_type: 'deposit',
                    po_number: currentPO.po_number,
                    receipt_url: receiptUrl,
                  },
                },
              });
            } catch (wecomError) {
              console.error('Failed to send WeCom notification:', wecomError);
            }
          }
        }
      }

      // Update Order payment tracking and log activity for customer payments
      if (type === 'customer_payment') {
        for (const alloc of selectedAllocations) {
          // Log activity
          await supabase.from('activity_logs').insert({
            action: 'payment_received',
            collection: 'orders',
            document_id: alloc.id,
            performed_by: user?.id || null,
            performed_by_email: user?.email || null,
            changes: {
              allocated_amount: alloc.allocateAmount,
              currency: formData.currency,
              payment_method: formData.payment_method,
              reference_number: formData.reference_number,
            },
            metadata: {
              financial_record_id: record.id,
              order_number: alloc.number,
            },
          });
        }
      }

      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
      queryClient.invalidateQueries({ queryKey: ['payment-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-customer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-supplier-pos'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['order-activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment recorded successfully with allocations');
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error('Failed to record payment: ' + error.message);
    },
  });

  const handleSubmit = () => {
    if (!selectedEntityId) {
      toast.error(`Please select a ${type === 'customer_payment' ? 'customer' : 'supplier'}`);
      return;
    }
    if (totalAllocated <= 0) {
      toast.error('Please allocate amounts to at least one order');
      return;
    }
    createPaymentWithAllocations.mutate();
  };

  const entityList = type === 'customer_payment' ? customers : suppliers;
  const entityLabel = type === 'customer_payment' ? 'Customer' : 'Supplier';
  const entityNameKey = type === 'customer_payment' ? 'company_name' : 'supplier_name';
  const itemLabel = type === 'customer_payment' ? 'Order' : 'PO';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Record {type === 'customer_payment' ? 'Customer' : 'Supplier'} Payment
          </DialogTitle>
          <DialogDescription>
            Select open {itemLabel.toLowerCase()}s and allocate payment amounts
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="grid gap-4 py-4 pr-4">
            {/* Entity Selection */}
            <div className="space-y-2">
              <Label>{entityLabel} *</Label>
              <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${entityLabel.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {entityList?.map((entity: any) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity[entityNameKey]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Mismatch Warning */}
            {type === 'supplier_payment' && selectedEntityId && allocations.some(a => a.selected && a.currency !== formData.currency) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Currency Mismatch Warning</AlertTitle>
                <AlertDescription>
                  You are paying in {formData.currency} but some POs are in a different currency.
                  {formData.currency === 'USD' && allocations.some(a => a.selected && a.currency === 'CNY') && (
                    <span className="block mt-1 font-medium">
                      ⚠️ Paying USD to a CNY/RMB supplier is unusual and may result in exchange rate discrepancies.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Unpaid Items List */}
            {selectedEntityId && allocations.length > 0 && (
              <div className="space-y-2">
                <Label>Open {itemLabel}s to Pay</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left w-8"></th>
                        <th className="p-2 text-left">{itemLabel} #</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-right">Paid</th>
                        <th className="p-2 text-right">Due</th>
                        <th className="p-2 text-right">Allocate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map(item => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2">
                            <Checkbox
                              checked={item.selected}
                              onCheckedChange={(checked) => toggleSelect(item.id, !!checked)}
                            />
                          </td>
                          <td className="p-2 font-medium">{item.number}</td>
                          <td className="p-2 text-right">
                            {item.currency} {item.totalValue.toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {item.currency} {item.totalPaid.toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-medium text-destructive">
                            {item.currency} {item.balanceDue.toLocaleString()}
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.allocateAmount || ''}
                              onChange={(e) => updateAllocation(item.id, parseFloat(e.target.value) || 0)}
                              className="w-28 text-right h-8"
                              placeholder="0.00"
                              max={item.balanceDue}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50 font-medium">
                      <tr className="border-t">
                        <td colSpan={5} className="p-2 text-right">Total Payment:</td>
                        <td className="p-2 text-right text-primary">
                          {formData.currency} {totalAllocated.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {selectedEntityId && allocations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No open {itemLabel.toLowerCase()}s found for this {entityLabel.toLowerCase()}
              </div>
            )}

            {/* Payment Details */}
            {totalAllocated > 0 && (
              <>
                <div className="border-t pt-4 mt-2">
                  <Label className="text-base font-medium">Payment Details</Label>
                </div>

                {/* Currency and Exchange Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CNY">CNY (RMB)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.currency !== 'USD' && (
                    <div className="space-y-2">
                      <Label>Exchange Rate (to USD)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={formData.exchange_rate || ''}
                        onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 1 })}
                        placeholder="1.0000"
                      />
                    </div>
                  )}
                </div>

                {/* Payment Method and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Reference Number */}
                <div className="space-y-2">
                  <Label>Reference / Transaction Number</Label>
                  <Input
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="TXN-12345 or Check #1234"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional details about the payment..."
                    rows={2}
                  />
                </div>

                {/* Receipt Upload */}
                <div className="space-y-2">
                  <Label>Receipt / Proof of Payment</Label>
                  {receiptUrl ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-green-600" />
                        <span className="text-sm truncate max-w-[200px]">{receiptFileName}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(receiptUrl, '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={removeReceipt}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload receipt (PDF, image)</span>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createPaymentWithAllocations.isPending || totalAllocated <= 0 || !selectedEntityId}
          >
            {createPaymentWithAllocations.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                Record {formData.currency} {totalAllocated.toLocaleString()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
