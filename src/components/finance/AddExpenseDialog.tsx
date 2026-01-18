import { useState } from 'react';
import { useCreateExpense, useExpenseCategories } from '@/hooks/useFinance';
import { BankAccountSelector } from './BankAccountSelector';
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
import { Plus, Receipt, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AddExpenseDialogProps {
  trigger?: React.ReactNode;
}

export function AddExpenseDialog({ trigger }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    category_id: '',
    bank_account_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    receipt_url: '',
  });
  const [uploading, setUploading] = useState(false);

  const { data: categories } = useExpenseCategories();
  const createExpense = useCreateExpense();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `receipts/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, receipt_url: urlData.publicUrl }));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }

    await createExpense.mutateAsync({
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      category_id: formData.category_id || undefined,
      bank_account_id: formData.bank_account_id || undefined,
      date: new Date(formData.date).toISOString(),
      notes: formData.notes || undefined,
      receipt_url: formData.receipt_url || undefined,
    });

    setFormData({
      amount: '',
      currency: 'USD',
      category_id: '',
      bank_account_id: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      receipt_url: '',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
          <DialogDescription>
            Add a new expense record to track your spending.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CNY">CNY (RMB)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bank Account</Label>
            <BankAccountSelector
              value={formData.bank_account_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, bank_account_id: value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Description / Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="What was this expense for?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="receipt-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('receipt-upload')?.click()}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  'Uploading...'
                ) : formData.receipt_url ? (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Receipt Uploaded
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Receipt
                  </>
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending}>
              {createExpense.isPending ? 'Recording...' : 'Record Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
