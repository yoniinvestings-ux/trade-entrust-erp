import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/ui/metric-card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Wallet, TrendingUp, TrendingDown, AlertTriangle, Clock, 
  CheckCircle, Calendar, DollarSign, ArrowUpRight, ArrowDownRight,
  Building2, Users, Truck
} from 'lucide-react';
import { format, addDays, isWithinInterval, parseISO } from 'date-fns';
import { CashFlowChart } from '@/components/finance/CashFlowChart';

export default function CashFlowDashboard() {
  const today = new Date();
  const endOfThisWeek = addDays(today, 7);
  const endOfNextWeek = addDays(today, 14);

  // Fetch bank accounts for total balance
  const { data: bankAccounts, isLoading: bankLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending customer payments (receivables)
  const { data: receivables, isLoading: receivablesLoading } = useQuery({
    queryKey: ['cash-flow-receivables'],
    queryFn: async () => {
      // Get orders with balance due
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, total_value, customer_deposit_amount, customer_balance_amount,
          customer_payment_status, status, estimated_ship_date,
          customer:customers(company_name)
        `)
        .not('status', 'in', '("cancelled","draft")')
        .not('customer_payment_status', 'eq', 'fully_paid');
      if (error) throw error;
      
      return orders?.map(order => ({
        ...order,
        balanceDue: (order.total_value || 0) - (order.customer_deposit_amount || 0) - (order.customer_balance_amount || 0),
      })).filter(o => o.balanceDue > 0) || [];
    },
  });

  // Fetch pending supplier payments (payables)
  const { data: payables, isLoading: payablesLoading } = useQuery({
    queryKey: ['cash-flow-payables'],
    queryFn: async () => {
      const { data: pos, error } = await supabase
        .from('purchase_orders')
        .select(`
          id, po_number, total_value, factory_deposit_amount, factory_balance_amount,
          payment_status, status, delivery_date, estimated_completion_date,
          supplier:suppliers(supplier_name)
        `)
        .not('status', 'in', '("cancelled")')
        .not('payment_status', 'eq', 'fully_paid');
      if (error) throw error;
      
      return pos?.map(po => ({
        ...po,
        balanceOwed: (po.total_value || 0) - (po.factory_deposit_amount || 0) - (po.factory_balance_amount || 0),
      })).filter(p => p.balanceOwed > 0) || [];
    },
  });

  // Fetch pending salaries
  const { data: pendingSalaries, isLoading: salariesLoading } = useQuery({
    queryKey: ['pending-salaries'],
    queryFn: async () => {
      const currentMonth = format(today, 'yyyy-MM');
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, base_salary_usd')
        .eq('status', 'active');
      if (error) throw error;
      
      // Check which employees have been paid this month
      const { data: payments } = await supabase
        .from('financial_records')
        .select('employee_id')
        .eq('type', 'salary')
        .eq('salary_month', currentMonth);
      
      const paidEmployeeIds = new Set(payments?.map(p => p.employee_id) || []);
      
      return data?.filter(e => !paidEmployeeIds.has(e.id)).map(e => ({
        ...e,
        amount: e.base_salary_usd,
      })) || [];
    },
  });

  // Calculate cash flow summary
  const summary = useMemo(() => {
    const totalBankBalance = bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;
    
    // Categorize payables by urgency
    const payablesThisWeek = payables?.filter(p => {
      if (!p.delivery_date && !p.estimated_completion_date) return false;
      const dueDate = parseISO(p.delivery_date || p.estimated_completion_date);
      return isWithinInterval(dueDate, { start: today, end: endOfThisWeek });
    }) || [];
    
    const payablesNextWeek = payables?.filter(p => {
      if (!p.delivery_date && !p.estimated_completion_date) return false;
      const dueDate = parseISO(p.delivery_date || p.estimated_completion_date);
      return isWithinInterval(dueDate, { start: endOfThisWeek, end: endOfNextWeek });
    }) || [];
    
    const payablesCanWait = payables?.filter(p => {
      if (!p.delivery_date && !p.estimated_completion_date) return true;
      const dueDate = parseISO(p.delivery_date || p.estimated_completion_date);
      return dueDate > endOfNextWeek;
    }) || [];

    const totalPayablesThisWeek = payablesThisWeek.reduce((sum, p) => sum + p.balanceOwed, 0);
    const totalPayablesNextWeek = payablesNextWeek.reduce((sum, p) => sum + p.balanceOwed, 0);
    const totalPayablesCanWait = payablesCanWait.reduce((sum, p) => sum + p.balanceOwed, 0);
    const totalSalariesPending = pendingSalaries?.reduce((sum, s) => sum + s.amount, 0) || 0;
    
    const totalPayables = (payables?.reduce((sum, p) => sum + p.balanceOwed, 0) || 0) + totalSalariesPending;
    const totalReceivables = receivables?.reduce((sum, r) => sum + r.balanceDue, 0) || 0;
    
    const netPosition = totalBankBalance - totalPayablesThisWeek - totalPayablesNextWeek + totalReceivables;

    return {
      totalBankBalance,
      totalReceivables,
      totalPayables,
      totalPayablesThisWeek,
      totalPayablesNextWeek,
      totalPayablesCanWait,
      totalSalariesPending,
      netPosition,
      payablesThisWeek,
      payablesNextWeek,
      payablesCanWait,
    };
  }, [bankAccounts, payables, receivables, pendingSalaries, today, endOfThisWeek, endOfNextWeek]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isLoading = bankLoading || receivablesLoading || payablesLoading || salariesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cash Flow Dashboard" 
        description={`Real-time financial position as of ${format(today, 'MMMM d, yyyy')}`}
      />

      {/* Top Summary Cards - Matching your Excel format */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-10 w-10 text-blue-600 p-2 bg-blue-100 rounded-lg" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Bank Balance (1)</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.totalBankBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowDownRight className="h-10 w-10 text-red-600 p-2 bg-red-100 rounded-lg" />
              <div>
                <p className="text-sm text-red-600 font-medium">Total Need Pay (2)</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalPayables)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="h-10 w-10 text-green-600 p-2 bg-green-100 rounded-lg" />
              <div>
                <p className="text-sm text-green-600 font-medium">Total Can Receive (3)</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalReceivables)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${summary.netPosition >= 0 ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {summary.netPosition >= 0 ? (
                <TrendingUp className="h-10 w-10 text-green-600 p-2 bg-green-100 rounded-lg" />
              ) : (
                <TrendingDown className="h-10 w-10 text-red-600 p-2 bg-red-100 rounded-lg" />
              )}
              <div>
                <p className={`text-sm font-medium ${summary.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Net Position (1-2+3)
                </p>
                <p className={`text-2xl font-bold ${summary.netPosition >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(summary.netPosition)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Schedule Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Pay This Week
            </CardTitle>
            <CardDescription>Due within 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600 mb-4">
              {formatCurrency(summary.totalPayablesThisWeek)}
            </p>
            {summary.payablesThisWeek.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {summary.payablesThisWeek.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                    <div>
                      <p className="font-medium">{p.po_number}</p>
                      <p className="text-xs text-muted-foreground">{p.supplier?.supplier_name}</p>
                    </div>
                    <span className="font-semibold text-red-600">{formatCurrency(p.balanceOwed)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payments due this week</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-orange-500" />
              Pay Next Week
            </CardTitle>
            <CardDescription>Due in 7-14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600 mb-4">
              {formatCurrency(summary.totalPayablesNextWeek)}
            </p>
            {summary.payablesNextWeek.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {summary.payablesNextWeek.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                    <div>
                      <p className="font-medium">{p.po_number}</p>
                      <p className="text-xs text-muted-foreground">{p.supplier?.supplier_name}</p>
                    </div>
                    <span className="font-semibold text-orange-600">{formatCurrency(p.balanceOwed)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payments due next week</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
              Can Wait
            </CardTitle>
            <CardDescription>Due after 2 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600 mb-4">
              {formatCurrency(summary.totalPayablesCanWait)}
            </p>
            {summary.payablesCanWait.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {summary.payablesCanWait.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                    <div>
                      <p className="font-medium">{p.po_number}</p>
                      <p className="text-xs text-muted-foreground">{p.supplier?.supplier_name}</p>
                    </div>
                    <span className="font-semibold text-blue-600">{formatCurrency(p.balanceOwed)}</span>
                  </div>
                ))}
                {summary.payablesCanWait.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{summary.payablesCanWait.length - 5} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No deferred payments</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart & Receivables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowChart />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Expected Receivables
            </CardTitle>
            <CardDescription>Customer payments pending</CardDescription>
          </CardHeader>
          <CardContent>
            {receivables && receivables.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.slice(0, 10).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.customer?.company_name}</TableCell>
                      <TableCell className="font-mono text-sm">{r.order_number}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(r.balanceDue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No pending receivables</p>
            )}
            {receivables && receivables.length > 10 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                +{receivables.length - 10} more customers
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Account Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {bankAccounts?.map((account) => (
              <div 
                key={account.id} 
                className="p-4 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{account.name}</span>
                  <Badge variant="outline">{account.currency}</Badge>
                </div>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: account.currency 
                  }).format(account.current_balance || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {account.bank_name}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
