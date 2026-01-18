import { useState } from 'react';
import { useCreateEmployee, useUpdateEmployee, Employee } from '@/hooks/useFinance';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, UserPlus } from 'lucide-react';

interface EmployeeFormDialogProps {
  trigger?: React.ReactNode;
  employee?: Employee;
  onSuccess?: () => void;
}

export function EmployeeFormDialog({ trigger, employee, onSuccess }: EmployeeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: employee?.full_name || '',
    employee_number: employee?.employee_number || '',
    department: employee?.department || '',
    position: employee?.position || '',
    base_salary_usd: employee?.base_salary_usd?.toString() || '',
    salary_currency: employee?.salary_currency || 'CNY',
    bank_account: employee?.bank_account || '',
    bank_name: employee?.bank_name || '',
    hire_date: employee?.hire_date || '',
  });

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.base_salary_usd) {
      return;
    }

    const data = {
      full_name: formData.full_name,
      employee_number: formData.employee_number || undefined,
      department: formData.department || undefined,
      position: formData.position || undefined,
      base_salary_usd: parseFloat(formData.base_salary_usd),
      salary_currency: formData.salary_currency,
      bank_account: formData.bank_account || undefined,
      bank_name: formData.bank_name || undefined,
      hire_date: formData.hire_date || undefined,
    };

    if (employee) {
      await updateEmployee.mutateAsync({ id: employee.id, ...data });
    } else {
      await createEmployee.mutateAsync(data);
    }

    setOpen(false);
    onSuccess?.();
  };

  const isEditing = !!employee;
  const isPending = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update employee information and salary details.'
              : 'Add a new employee for salary management.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_number">Employee ID</Label>
              <Input
                id="employee_number"
                value={formData.employee_number}
                onChange={(e) => setFormData(prev => ({ ...prev, employee_number: e.target.value }))}
                placeholder="EMP-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Sourcing">Sourcing</SelectItem>
                  <SelectItem value="QC">QC</SelectItem>
                  <SelectItem value="Logistics">Logistics</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="Manager"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_salary_usd">Base Salary (USD) *</Label>
              <Input
                id="base_salary_usd"
                type="number"
                step="0.01"
                value={formData.base_salary_usd}
                onChange={(e) => setFormData(prev => ({ ...prev, base_salary_usd: e.target.value }))}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Monthly salary in USD (will be converted to RMB for payment)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Bank Details (for payments)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                  placeholder="ICBC, CCB, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account">Account Number</Label>
                <Input
                  id="bank_account"
                  value={formData.bank_account}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_account: e.target.value }))}
                  placeholder="xxxx xxxx xxxx"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update Employee' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
