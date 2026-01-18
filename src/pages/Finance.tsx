import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt, 
  Wallet, PiggyBank, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { format } from 'date-fns';

export default function Finance() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch financial records
  const { data: financialRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['financial-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_records')
        .select(`
          *,
          order:orders(id, order_number, customer:customers(company_name))
        `)
        .order('date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders with financial summary
  const { data: ordersFinancials } = useQuery({
    queryKey: ['orders-financials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, total_value, profit_margin, status, currency,
          customer:customers(company_name),
          purchase_orders(total_value)
        `)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Calculate summary metrics
  const totalRevenue = ordersFinancials?.reduce((sum, order) => sum + (order.total_value || 0), 0) || 0;
  const totalSupplierCost = ordersFinancials?.reduce((sum, order) => 
    sum + (order.purchase_orders?.reduce((poSum, po) => poSum + (po.total_value || 0), 0) || 0), 0) || 0;
  const totalProfit = totalRevenue - totalSupplierCost;
  const averageMargin = ordersFinancials?.length 
    ? ordersFinancials.reduce((sum, order) => sum + (order.profit_margin || 0), 0) / ordersFinancials.length 
    : 0;

  const customerPayments = financialRecords?.filter(r => r.type === 'customer_payment') || [];
  const supplierPayments = financialRecords?.filter(r => r.type === 'supplier_payment') || [];
  const expenses = financialRecords?.filter(r => r.type === 'expense') || [];
  const salaries = financialRecords?.filter(r => r.type === 'salary') || [];

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      paid: 'bg-green-500',
      overdue: 'bg-red-500',
      partial: 'bg-blue-500',
    };
    return (
      <Badge variant="secondary" className={`${colors[status] || 'bg-gray-500'} text-white`}>
        {status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer_payment': return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'supplier_payment': return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case 'expense': return <Receipt className="h-4 w-4 text-orange-500" />;
      case 'salary': return <Wallet className="h-4 w-4 text-blue-500" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Finance" 
        description="Track payments, expenses, and financial performance"
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          trend={{ value: 12, isPositive: true }}
          description="from orders"
        />
        <MetricCard
          title="Supplier Costs"
          value={formatCurrency(totalSupplierCost)}
          icon={TrendingDown}
          description="purchase orders"
        />
        <MetricCard
          title="Gross Profit"
          value={formatCurrency(totalProfit)}
          icon={PiggyBank}
          trend={{ value: averageMargin, isPositive: true }}
          description={`${averageMargin.toFixed(1)}% avg margin`}
        />
        <MetricCard
          title="Cash Flow"
          value={formatCurrency(totalProfit - (expenses.reduce((s, e) => s + e.amount, 0) + salaries.reduce((s, e) => s + e.amount, 0)))}
          icon={CreditCard}
          description="after expenses"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="supplier">Supplier</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="salaries">Salaries</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : financialRecords?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {financialRecords?.slice(0, 8).map(record => (
                      <div key={record.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(record.type)}
                          <div>
                            <p className="text-sm font-medium capitalize">{record.type.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">
                              {record.order?.order_number || record.notes || '-'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            record.type === 'customer_payment' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {record.type === 'customer_payment' ? '+' : '-'}
                            {formatCurrency(record.amount, record.currency || 'USD')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(record.date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Orders Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ordersFinancials?.slice(0, 6).map(order => {
                    const supplierCost = order.purchase_orders?.reduce((sum, po) => sum + (po.total_value || 0), 0) || 0;
                    const profit = (order.total_value || 0) - supplierCost;
                    return (
                      <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-mono">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">{order.customer?.company_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(order.total_value || 0)}</p>
                          <p className={`text-xs ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Profit: {formatCurrency(profit)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No customer payments recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    customerPayments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">{payment.order?.order_number || '-'}</TableCell>
                        <TableCell>{payment.order?.customer?.company_name || '-'}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(payment.amount, payment.currency || 'USD')}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(payment.date), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplier" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No supplier payments recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    supplierPayments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.notes || '-'}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {formatCurrency(payment.amount, payment.currency || 'USD')}
                        </TableCell>
                        <TableCell className="capitalize">{payment.payment_method || '-'}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(payment.date), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No expenses recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.notes || '-'}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(expense.amount, expense.currency || 'USD')}
                        </TableCell>
                        <TableCell>{getStatusBadge(expense.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(expense.date), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salaries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Salaries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No salary payments recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    salaries.map(salary => (
                      <TableRow key={salary.id}>
                        <TableCell>{salary.notes || '-'}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(salary.amount, salary.currency || 'USD')}
                        </TableCell>
                        <TableCell>{getStatusBadge(salary.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(salary.date), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
