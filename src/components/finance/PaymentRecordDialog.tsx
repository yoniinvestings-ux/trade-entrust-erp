import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Upload, Loader2, X, Receipt, DollarSign, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentRecordDialogProps {
  type: 'customer_payment' | 'supplier_payment';
  orderId?: string;
  purchaseOrderId?: string;
  customerId?: string;
  supplierId?: string;
  orderNumber?: string;
  defaultCurrency?: string;
  defaultAmount?: number;
  purpose?: 'deposit' | 'balance' | 'full';
  hasWeComWebhook?: boolean;
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

export function PaymentRecordDialog({
  type,
  orderId,
  purchaseOrderId,
  customerId,
  supplierId,
  orderNumber,
  defaultCurrency = 'USD',
  defaultAmount,
  purpose = 'full',
  hasWeComWebhook = false,
  onSuccess,
  children,
}: PaymentRecordDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [sendWeComNotification, setSendWeComNotification] = useState(hasWeComWebhook);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    amount: defaultAmount || 0,
    currency: defaultCurrency,
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    exchange_rate: 1,
  });

  const resetForm = () => {
    setFormData({
      amount: defaultAmount || 0,
      currency: defaultCurrency,
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      exchange_rate: 1,
    });
    setReceiptUrl(null);
    setReceiptFileName(null);
    setSendWeComNotification(hasWeComWebhook);
  };

  const uploadReceipt = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `receipts/${orderId || purchaseOrderId || 'general'}/${fileName}`;

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

  // Map purpose to valid database enum values
  const mapPurposeToDbValue = () => {
    if (type === 'customer_payment') {
      if (purpose === 'deposit') return 'customer_deposit';
      if (purpose === 'balance') return 'customer_balance';
      return 'customer_deposit'; // default for 'full'
    } else {
      if (purpose === 'deposit') return 'factory_deposit';
      if (purpose === 'balance') return 'factory_balance';
      return 'factory_deposit'; // default for 'full'
    }
  };

  const createPayment = useMutation({
    mutationFn: async () => {
      const { data: paymentRecord, error } = await supabase.from('financial_records').insert({
        type,
        order_id: orderId || null,
        purchase_order_id: purchaseOrderId || null,
        customer_id: customerId || null,
        supplier_id: supplierId || null,
        amount: formData.amount,
        currency: formData.currency,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        date: new Date(formData.date).toISOString(),
        receipt_url: receiptUrl,
        status: 'completed',
        purpose: mapPurposeToDbValue(),
        exchange_rate: formData.exchange_rate !== 1 ? formData.exchange_rate : null,
      }).select().single();
      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      const activityCollection = purchaseOrderId ? 'purchase_order' : 'order';
      const activityDocId = purchaseOrderId || orderId;
      if (activityDocId) {
        await supabase.from('activity_logs').insert([{
          action: `Payment recorded: ${formData.currency} ${formData.amount.toLocaleString()} (${mapPurposeToDbValue().replace('_', ' ')})`,
          collection: activityCollection,
          document_id: activityDocId,
          performed_by: user?.id,
          performed_by_email: user?.email,
          metadata: {
            amount: formData.amount,
            currency: formData.currency,
            purpose: mapPurposeToDbValue(),
            payment_method: formData.payment_method,
            financial_record_id: paymentRecord?.id,
          },
        }]);
      }

      // Update order/PO payment status
      if (type === 'customer_payment' && orderId) {
        const statusUpdate: Record<string, any> = {};
        if (purpose === 'deposit') {
          statusUpdate.customer_deposit_amount = formData.amount;
          statusUpdate.customer_payment_status = 'deposit_received';
        } else if (purpose === 'balance') {
          statusUpdate.customer_balance_amount = formData.amount;
          statusUpdate.customer_payment_status = 'fully_paid';
        } else {
          statusUpdate.customer_deposit_amount = formData.amount;
          statusUpdate.customer_payment_status = 'fully_paid';
        }
        await supabase.from('orders').update(statusUpdate).eq('id', orderId);
      }

      if (type === 'supplier_payment' && purchaseOrderId) {
        const statusUpdate: Record<string, any> = {};
        if (purpose === 'deposit') {
          statusUpdate.factory_deposit_amount = formData.amount;
          statusUpdate.factory_deposit_paid_at = new Date().toISOString();
          statusUpdate.payment_status = 'deposit_paid';
        } else if (purpose === 'balance') {
          statusUpdate.factory_balance_amount = formData.amount;
          statusUpdate.factory_balance_paid_at = new Date().toISOString();
          statusUpdate.payment_status = 'fully_paid';
        } else {
          statusUpdate.factory_deposit_amount = formData.amount;
          statusUpdate.factory_deposit_paid_at = new Date().toISOString();
          statusUpdate.payment_status = 'fully_paid';
        }
        await supabase.from('purchase_orders').update(statusUpdate).eq('id', purchaseOrderId);
      }

      // Send WeCom notification if enabled
      if (sendWeComNotification && type === 'supplier_payment' && supplierId && purchaseOrderId) {
        try {
          await supabase.functions.invoke('wecom-send', {
            body: {
              supplier_id: supplierId,
              message_type: 'payment_sent',
              entity_type: 'purchase_order',
              entity_id: purchaseOrderId,
              metadata: {
                po_number: orderNumber,
                amount: formData.amount,
                currency: formData.currency,
                payment_type: purpose,
              },
            },
          });
        } catch (wecomError) {
          console.error('WeCom notification failed:', wecomError);
          // Don't fail the payment if WeCom fails
        }
      }

      return paymentRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-records'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['po-activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['order-activity-timeline'] });
      toast.success(sendWeComNotification && type === 'supplier_payment' ? 'Payment recorded & factory notified' : 'Payment recorded successfully');
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error('Failed to record payment: ' + error.message);
    },
  });

  const handleSubmit = () => {
    if (formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    createPayment.mutate();
  };

  const purposeLabels = {
    deposit: 'Deposit Payment',
    balance: 'Balance Payment',
    full: 'Full Payment',
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Record {type === 'customer_payment' ? 'Customer' : 'Supplier'} Payment
          </DialogTitle>
          <DialogDescription>
            {orderNumber && `For ${orderNumber} • `}{purposeLabels[purpose]}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
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
          </div>

          {/* Exchange Rate (shown if not USD) */}
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
              <p className="text-xs text-muted-foreground">
                ≈ ${(formData.amount / formData.exchange_rate).toFixed(2)} USD
              </p>
            </div>
          )}

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

          {/* WeCom Notification (for supplier payments) */}
          {type === 'supplier_payment' && hasWeComWebhook && (
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Checkbox
                id="wecom-notification"
                checked={sendWeComNotification}
                onCheckedChange={(checked) => setSendWeComNotification(checked === true)}
              />
              <label
                htmlFor="wecom-notification"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Send payment notification to factory via WeCom
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createPayment.isPending || formData.amount <= 0}>
            {createPayment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              'Record Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}