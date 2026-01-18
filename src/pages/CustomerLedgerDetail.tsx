import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { 
  ArrowLeft, Download, FileSpreadsheet, Printer, DollarSign, 
  TrendingUp, TrendingDown, CreditCard, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { format } from 'date-fns';
import { PaymentRecordDialog } from '@/components/finance/PaymentRecordDialog';

interface LedgerEntry {
  serial: number;
  date: string;
  description: string;
  invoiceNumber: string | null;
  orderId: string | null;
  recordId: string | null;
  debit: number;
  credit: number;
  balance: number;
  remark: string | null;
  type: 'order' | 'payment' | 'adjustment';
  projectTitle: string | null;
}

export default function CustomerLedgerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showStatus, setShowStatus] = useState<'all' | 'open' | 'closed'>('all');

  // Fetch customer details
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch customer orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total_value, status, created_at, currency, sourcing_project:sourcing_projects(project_title)')
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch customer payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['customer-payments-ledger', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('type', 'customer_payment')
        .neq('status', 'void')
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch payment allocations
  const { data: allocations } = useQuery({
    queryKey: ['payment-allocations-customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_allocations')
        .select(`
          *,
          order:orders!payment_allocations_order_id_fkey(order_number)
        `)
        .not('order_id', 'is', null);
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Build ledger entries with running balance
  const ledgerEntries = useMemo(() => {
    if (!orders || !payments) return [];

    const entries: LedgerEntry[] = [];
    let serial = 0;
    let runningBalance = 0;

    // Combine orders and payments into a single sorted list
    const allEvents: Array<{
      date: string;
      type: 'order' | 'payment';
      data: any;
    }> = [];

    orders.forEach(order => {
      allEvents.push({
        date: order.created_at,
        type: 'order',
        data: order,
      });
    });

    payments.forEach(payment => {
      allEvents.push({
        date: payment.date,
        type: 'payment',
        data: payment,
      });
    });

    // Sort by date
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build ledger entries
    allEvents.forEach(event => {
      serial++;
      
      if (event.type === 'order') {
        const order = event.data;
        const debit = order.total_value || 0;
        runningBalance += debit;

        entries.push({
          serial,
          date: order.created_at,
          description: `Order Placed`,
          invoiceNumber: order.order_number,
          orderId: order.id,
          recordId: null,
          debit,
          credit: 0,
          balance: runningBalance,
          remark: order.status === 'delivered' ? 'Closed' : 'Open',
          type: 'order',
          projectTitle: (order as any).sourcing_project?.project_title || null,
        });
      } else {
        const payment = event.data;
        const credit = payment.amount || 0;
        runningBalance -= credit;

        // Check if payment covers multiple orders
        const paymentAllocations = allocations?.filter(a => a.financial_record_id === payment.id) || [];
        const allocatedOrderNums = paymentAllocations.map(a => a.order?.order_number).filter(Boolean);
        
        entries.push({
          serial,
          date: payment.date,
          description: `Payment Received`,
          invoiceNumber: allocatedOrderNums.length > 0 
            ? allocatedOrderNums.join('/') 
            : payment.reference_number || 'General',
          orderId: null,
          recordId: payment.id,
          debit: 0,
          credit,
          balance: runningBalance,
          remark: payment.payment_method || null,
          type: 'payment',
          projectTitle: null,
        });
      }
    });

    return entries;
  }, [orders, payments, allocations]);

  // Filter entries by date
  const filteredEntries = useMemo(() => {
    let filtered = ledgerEntries;

    if (dateFrom) {
      filtered = filtered.filter(e => e.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(e => e.date <= dateTo + 'T23:59:59');
    }
    if (showStatus === 'open') {
      filtered = filtered.filter(e => e.type !== 'order' || e.remark !== 'Closed');
    } else if (showStatus === 'closed') {
      filtered = filtered.filter(e => e.type === 'order' && e.remark === 'Closed');
    }

    return filtered;
  }, [ledgerEntries, dateFrom, dateTo, showStatus]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
    const balance = totalDebit - totalCredit;
    const openOrders = orders?.filter(o => !['delivered', 'completed'].includes(o.status)).length || 0;
    return { totalDebit, totalCredit, balance, openOrders };
  }, [ledgerEntries, orders]);

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const exportToExcel = () => {
    const headers = ['Serial', 'Date', 'Description', 'Invoice #', 'Debit ($)', 'Credit ($)', 'Balance ($)', 'Remark'];
    const rows = filteredEntries.map(e => [
      e.serial,
      format(new Date(e.date), 'MM/dd/yy'),
      e.description,
      e.invoiceNumber || '',
      e.debit || '',
      e.credit || '',
      e.balance.toFixed(2),
      e.remark || '',
    ]);

    const csvContent = [
      `${customer?.company_name} - Customer Ledger`,
      `Generated: ${format(new Date(), 'MMMM d, yyyy')}`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '',
      `Total Debit,,,,$${summary.totalDebit.toFixed(2)}`,
      `Total Credit,,,,,$${summary.totalCredit.toFixed(2)}`,
      `Balance Due,,,,,,$${summary.balance.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${customer?.company_name}_Ledger_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const isLoading = customerLoading || ordersLoading || paymentsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`${customer?.company_name} Ledger`}
        description={`Account statement for ${customer?.contact_person}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export
          </Button>
          <PaymentRecordDialog
            type="customer_payment"
            customerId={customerId}
            onSuccess={() => {}}
          >
            <Button>
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </PaymentRecordDialog>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Total Invoiced</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalDebit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-10 w-10 text-green-500 p-2 bg-green-500/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCredit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {summary.balance > 0 ? (
                <AlertTriangle className="h-10 w-10 text-orange-500 p-2 bg-orange-500/10 rounded-lg" />
              ) : (
                <CheckCircle className="h-10 w-10 text-green-500 p-2 bg-green-500/10 rounded-lg" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className={`text-2xl font-bold ${summary.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(summary.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-10 w-10 text-blue-500 p-2 bg-blue-500/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Open Orders</p>
                <p className="text-2xl font-bold">{summary.openOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Account Ledger</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">From:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">To:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <Select value={showStatus} onValueChange={(v: any) => setShowStatus(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open Only</SelectItem>
                  <SelectItem value="closed">Closed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16 font-bold">Serial</TableHead>
                  <TableHead className="font-bold">Project</TableHead>
                  <TableHead className="font-bold">Description</TableHead>
                  <TableHead className="font-bold">Invoice #</TableHead>
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="text-right font-bold">Debit ($)</TableHead>
                  <TableHead className="text-right font-bold">Credit ($)</TableHead>
                  <TableHead className="text-right font-bold">Balance ($)</TableHead>
                  <TableHead className="font-bold">Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Opening Balance Row */}
                <TableRow className="bg-muted/30">
                  <TableCell className="font-medium">-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-medium">Opening Balance</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right font-bold">$0.00</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>

                {filteredEntries.map((entry) => (
                  <TableRow 
                    key={`${entry.type}-${entry.serial}`}
                    className={entry.type === 'payment' ? 'bg-green-50 dark:bg-green-950/20' : ''}
                  >
                    <TableCell className="font-medium">{entry.serial}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{entry.projectTitle || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.description}
                        {entry.orderId && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => navigate(`/dashboard/orders/${entry.orderId}`)}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{entry.invoiceNumber || '-'}</TableCell>
                    <TableCell>{format(new Date(entry.date), 'MM/dd/yy')}</TableCell>
                    <TableCell className="text-right">
                      {entry.debit > 0 ? (
                        <span className="text-red-600 font-medium">{formatCurrency(entry.debit)}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.credit > 0 ? (
                        <span className="text-green-600 font-medium">{formatCurrency(entry.credit)}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${entry.balance > 0 ? 'text-orange-600' : entry.balance < 0 ? 'text-green-600' : ''}`}>
                      {formatCurrency(entry.balance)}
                    </TableCell>
                    <TableCell>
                      {entry.remark && (
                        <Badge variant={entry.remark === 'Closed' ? 'secondary' : 'outline'} className="text-xs">
                          {entry.remark}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals Row */}
                <TableRow className="bg-muted font-bold border-t-2">
                  <TableCell colSpan={5} className="text-right">TOTALS:</TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(summary.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(summary.totalCredit)}
                  </TableCell>
                  <TableCell className={`text-right ${summary.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(summary.balance)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No ledger entries found for the selected criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
