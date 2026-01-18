import { useState, useEffect } from 'react';
import { useRecordSalary, useEmployees } from '@/hooks/useFinance';
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
import { Plus, Calculator, RefreshCw } from 'lucide-react';

interface SalaryRecordDialogProps {
  trigger?: React.ReactNode;
  defaultEmployeeId?: string;
}

export function SalaryRecordDialog({ trigger, defaultEmployeeId }: SalaryRecordDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: defaultEmployeeId || '',
    amount_usd: '',
    amount_rmb: '',
    exchange_rate: '7.25',
    bank_account_id: '',
    salary_month: new Date().toISOString().slice(0, 7),
    notes: '',
  });

  const { data: employees } = useEmployees();
  const recordSalary = useRecordSalary();

  // When employee is selected, auto-fill base salary
  useEffect(() => {
    if (formData.employee_id && employees) {
      const employee = employees.find(e => e.id === formData.employee_id);
      if (employee && employee.base_salary_usd) {
        const usdAmount = employee.base_salary_usd.toString();
        const rate = parseFloat(formData.exchange_rate) || 7.25;
        const rmbAmount = (employee.base_salary_usd * rate).toFixed(2);
        setFormData(prev => ({
          ...prev,
          amount_usd: usdAmount,
          amount_rmb: rmbAmount,
        }));
      }
    }
  }, [formData.employee_id, employees]);

  // Recalculate RMB when exchange rate changes
  useEffect(() => {
    if (formData.amount_usd && formData.exchange_rate) {
      const usd = parseFloat(formData.amount_usd);
      const rate = parseFloat(formData.exchange_rate);
      if (!isNaN(usd) && !isNaN(rate)) {
        setFormData(prev => ({
          ...prev,
          amount_rmb: (usd * rate).toFixed(2),
        }));
      }
    }
  }, [formData.exchange_rate, formData.amount_usd]);

  const selectedEmployee = employees?.find(e => e.id === formData.employee_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.amount_usd || !formData.amount_rmb) {
      return;
    }

    await recordSalary.mutateAsync({
      employee_id: formData.employee_id,
      amount: parseFloat(formData.amount_usd),
      amount_local: parseFloat(formData.amount_rmb),
      local_currency: 'CNY',
      exchange_rate: parseFloat(formData.exchange_rate),
      bank_account_id: formData.bank_account_id || undefined,
      salary_month: formData.salary_month,
      notes: formData.notes || undefined,
    });

    setFormData({
      employee_id: '',
      amount_usd: '',
      amount_rmb: '',
      exchange_rate: '7.25',
      bank_account_id: '',
      salary_month: new Date().toISOString().slice(0, 7),
      notes: '',
    });
    setOpen(false);
  };

  const fetchExchangeRate = () => {
    // In production, this would call an API
    // For now, use a reasonable estimate
    setFormData(prev => ({ ...prev, exchange_rate: '7.25' }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Record Salary
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Record Salary Payment</DialogTitle>
          <DialogDescription>
            Record a salary payment with USD to RMB conversion.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{emp.full_name}</span>
                      <span className="text-muted-foreground text-sm">
                        ${emp.base_salary_usd.toLocaleString()}/mo
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEmployee && (
              <p className="text-sm text-muted-foreground">
                {selectedEmployee.position} • {selectedEmployee.department}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Salary Month</Label>
            <Input
              type="month"
              value={formData.salary_month}
              onChange={(e) => setFormData(prev => ({ ...prev, salary_month: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount_usd}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_usd: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Exchange Rate
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={fetchExchangeRate}
                  title="Refresh rate"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </Label>
              <Input
                type="number"
                step="0.01"
                value={formData.exchange_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, exchange_rate: e.target.value }))}
                placeholder="7.25"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (RMB)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount_rmb}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_rmb: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg flex items-center gap-2">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>${formData.amount_usd || '0'}</strong> USD = <strong>¥{formData.amount_rmb || '0'}</strong> RMB
              @ {formData.exchange_rate} rate
            </span>
          </div>

          <div className="space-y-2">
            <Label>Bank Account</Label>
            <BankAccountSelector
              value={formData.bank_account_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, bank_account_id: value }))}
              placeholder="Select payment source"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any notes about this payment..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordSalary.isPending}>
              {recordSalary.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
