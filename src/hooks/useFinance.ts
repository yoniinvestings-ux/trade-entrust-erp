import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_number: string | null;
  currency: string;
  current_balance: number;
  last_synced_at: string | null;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  budget_monthly: number | null;
  budget_currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  employee_number: string | null;
  full_name: string;
  department: string | null;
  position: string | null;
  base_salary_usd: number;
  salary_currency: string;
  bank_account: string | null;
  bank_name: string | null;
  hire_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialRecord {
  id: string;
  type: string;
  amount: number;
  currency: string | null;
  exchange_rate: number | null;
  date: string;
  status: string;
  payment_method: string | null;
  purpose: string | null;
  reference_number: string | null;
  receipt_url: string | null;
  notes: string | null;
  order_id: string | null;
  purchase_order_id: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  bank_account_id: string | null;
  category_id: string | null;
  employee_id: string | null;
  amount_local: number | null;
  local_currency: string | null;
  salary_month: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  // Joined data
  bank_account?: BankAccount;
  category?: ExpenseCategory;
  employee?: Employee;
  customer?: { id: string; company_name: string };
  supplier?: { id: string; supplier_name: string };
  order?: { id: string; order_number: string };
  purchase_order?: { id: string; po_number: string };
}

// Bank Accounts
export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      return data as BankAccount[];
    },
  });
}

export function useUpdateBankBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ current_balance: balance, last_synced_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Bank balance updated');
    },
    onError: (error) => {
      toast.error('Failed to update balance: ' + error.message);
    },
  });
}

// Expense Categories
export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Partial<ExpenseCategory>) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([category as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Category created');
    },
    onError: (error) => {
      toast.error('Failed to create category: ' + error.message);
    },
  });
}

// Employees
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('full_name');
      
      if (error) throw error;
      return data as Employee[];
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employee: Partial<Employee>) => {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee added');
    },
    onError: (error) => {
      toast.error('Failed to add employee: ' + error.message);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      const { error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
    },
    onError: (error) => {
      toast.error('Failed to update employee: ' + error.message);
    },
  });
}

// Customer Payments
export function useCustomerPayments(filters?: {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['customer-payments', filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_records')
        .select(`
          *,
          customer:customers(id, company_name),
          order:orders(id, order_number),
          bank_account:bank_accounts(id, name)
        `)
        .eq('type', 'customer_payment')
        .order('date', { ascending: false });
      
      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialRecord[];
    },
  });
}

export function useCustomerPaymentStats() {
  return useQuery({
    queryKey: ['customer-payment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_records')
        .select('amount, status, currency')
        .eq('type', 'customer_payment');
      
      if (error) throw error;
      
      const stats = {
        totalReceived: 0,
        pending: 0,
        count: data?.length || 0,
      };
      
      data?.forEach((record) => {
        if (record.status === 'completed') {
          stats.totalReceived += Number(record.amount);
        } else if (record.status === 'pending') {
          stats.pending += Number(record.amount);
        }
      });
      
      return stats;
    },
  });
}

// Supplier Payments
export function useSupplierPayments(filters?: {
  dateFrom?: string;
  dateTo?: string;
  supplierId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['supplier-payments', filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_records')
        .select(`
          *,
          supplier:suppliers(id, supplier_name),
          purchase_order:purchase_orders(id, po_number),
          bank_account:bank_accounts(id, name)
        `)
        .eq('type', 'supplier_payment')
        .order('date', { ascending: false });
      
      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialRecord[];
    },
  });
}

export function useSupplierPaymentStats() {
  return useQuery({
    queryKey: ['supplier-payment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_records')
        .select('amount, status, currency')
        .eq('type', 'supplier_payment');
      
      if (error) throw error;
      
      const stats = {
        totalPaid: 0,
        pending: 0,
        count: data?.length || 0,
      };
      
      data?.forEach((record) => {
        if (record.status === 'completed') {
          stats.totalPaid += Number(record.amount);
        } else if (record.status === 'pending') {
          stats.pending += Number(record.amount);
        }
      });
      
      return stats;
    },
  });
}

// Expenses
export function useExpenses(filters?: {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_records')
        .select(`
          *,
          category:expense_categories(id, name),
          bank_account:bank_accounts(id, name)
        `)
        .eq('type', 'expense')
        .order('date', { ascending: false });
      
      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialRecord[];
    },
  });
}

export function useExpenseStats() {
  return useQuery({
    queryKey: ['expense-stats'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('financial_records')
        .select('amount, status, category_id')
        .eq('type', 'expense')
        .gte('date', startOfMonth.toISOString());
      
      if (error) throw error;
      
      const stats = {
        totalMTD: 0,
        pendingApproval: 0,
        count: data?.length || 0,
      };
      
      data?.forEach((record) => {
        stats.totalMTD += Number(record.amount);
        if (record.status === 'pending') {
          stats.pendingApproval++;
        }
      });
      
      return stats;
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expense: {
      amount: number;
      currency?: string;
      category_id?: string;
      bank_account_id?: string;
      date?: string;
      notes?: string;
      receipt_url?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('financial_records')
        .insert({
          type: 'expense',
          amount: expense.amount,
          currency: expense.currency || 'USD',
          category_id: expense.category_id,
          bank_account_id: expense.bank_account_id,
          date: expense.date || new Date().toISOString(),
          notes: expense.notes,
          receipt_url: expense.receipt_url,
          status: 'completed',
          created_by: userData.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense recorded');
    },
    onError: (error) => {
      toast.error('Failed to record expense: ' + error.message);
    },
  });
}

// Salary Records
export function useSalaryRecords(filters?: {
  month?: string;
  employeeId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['salary-records', filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_records')
        .select(`
          *,
          employee:employees(id, full_name, department, position, base_salary_usd),
          bank_account:bank_accounts(id, name)
        `)
        .eq('type', 'salary')
        .order('date', { ascending: false });
      
      if (filters?.month) {
        query = query.eq('salary_month', filters.month);
      }
      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialRecord[];
    },
  });
}

export function useSalaryStats() {
  return useQuery({
    queryKey: ['salary-stats'],
    queryFn: async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const { data: salaryData, error: salaryError } = await supabase
        .from('financial_records')
        .select('amount, amount_local, status')
        .eq('type', 'salary')
        .eq('salary_month', currentMonth);
      
      if (salaryError) throw salaryError;
      
      const { data: employeeData, error: empError } = await supabase
        .from('employees')
        .select('id, base_salary_usd')
        .eq('status', 'active');
      
      if (empError) throw empError;
      
      const stats = {
        totalPayrollUSD: 0,
        totalPayrollRMB: 0,
        paidCount: 0,
        pendingCount: employeeData?.length || 0,
        employeeCount: employeeData?.length || 0,
      };
      
      salaryData?.forEach((record) => {
        stats.totalPayrollUSD += Number(record.amount);
        stats.totalPayrollRMB += Number(record.amount_local) || 0;
        if (record.status === 'completed') {
          stats.paidCount++;
          stats.pendingCount--;
        }
      });
      
      return stats;
    },
  });
}

export function useRecordSalary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (salary: {
      employee_id: string;
      amount: number;
      amount_local: number;
      local_currency?: string;
      exchange_rate: number;
      bank_account_id?: string;
      salary_month: string;
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('financial_records')
        .insert({
          type: 'salary',
          amount: salary.amount,
          currency: 'USD',
          amount_local: salary.amount_local,
          local_currency: salary.local_currency || 'CNY',
          exchange_rate: salary.exchange_rate,
          employee_id: salary.employee_id,
          bank_account_id: salary.bank_account_id,
          salary_month: salary.salary_month,
          date: new Date().toISOString(),
          notes: salary.notes,
          status: 'completed',
          created_by: userData.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      queryClient.invalidateQueries({ queryKey: ['salary-stats'] });
      toast.success('Salary recorded');
    },
    onError: (error) => {
      toast.error('Failed to record salary: ' + error.message);
    },
  });
}

// Cash Flow
export function useCashFlowData() {
  return useQuery({
    queryKey: ['cash-flow-data'],
    queryFn: async () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const { data, error } = await supabase
        .from('financial_records')
        .select('type, amount, date, status')
        .gte('date', threeMonthsAgo.toISOString())
        .order('date');
      
      if (error) throw error;
      
      // Group by month
      const monthlyData: Record<string, { inflows: number; outflows: number }> = {};
      
      data?.forEach((record) => {
        const month = record.date.slice(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { inflows: 0, outflows: 0 };
        }
        
        if (record.type === 'customer_payment' && record.status === 'completed') {
          monthlyData[month].inflows += Number(record.amount);
        } else if (['supplier_payment', 'expense', 'salary'].includes(record.type) && record.status === 'completed') {
          monthlyData[month].outflows += Number(record.amount);
        }
      });
      
      return monthlyData;
    },
  });
}

// Profit/Loss
export function useProfitLoss(period?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['profit-loss', period],
    queryFn: async () => {
      let query = supabase
        .from('financial_records')
        .select('type, amount, status')
        .eq('status', 'completed');
      
      if (period?.from) {
        query = query.gte('date', period.from);
      }
      if (period?.to) {
        query = query.lte('date', period.to);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const result = {
        revenue: 0,
        supplierCosts: 0,
        expenses: 0,
        salaries: 0,
        netProfit: 0,
      };
      
      data?.forEach((record) => {
        const amount = Number(record.amount);
        switch (record.type) {
          case 'customer_payment':
            result.revenue += amount;
            break;
          case 'supplier_payment':
            result.supplierCosts += amount;
            break;
          case 'expense':
            result.expenses += amount;
            break;
          case 'salary':
            result.salaries += amount;
            break;
        }
      });
      
      result.netProfit = result.revenue - result.supplierCosts - result.expenses - result.salaries;
      
      return result;
    },
  });
}
