import { useState } from 'react';
import { useSupplierPayments, useSupplierPaymentStats } from '@/hooks/useFinance';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaymentAllocationDialog } from '@/components/finance/PaymentAllocationDialog';
import { DollarSign, Clock, CheckCircle, AlertTriangle, Download, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function SupplierPayments() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const { data: payments, isLoading } = useSupplierPayments({
    status: filters.status || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });
  const { data: stats } = useSupplierPaymentStats();

  const filteredPayments = payments?.filter(p => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      p.supplier?.supplier_name?.toLowerCase().includes(search) ||
      p.purchase_order?.po_number?.toLowerCase().includes(search) ||
      p.reference_number?.toLowerCase().includes(search)
    );
  });

  const columns: Column<any>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: (item) => format(new Date(item.date), 'MMM dd, yyyy'),
    },
    {
      key: 'po',
      header: 'PO Number',
      cell: (item) => (
        <Button
          variant="link"
          className="p-0 h-auto font-medium"
          onClick={(e) => {
            e.stopPropagation();
            if (item.purchase_order_id) navigate(`/dashboard/purchase-orders/${item.purchase_order_id}`);
          }}
        >
          {item.purchase_order?.po_number || '-'}
        </Button>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      cell: (item) => item.supplier?.supplier_name || '-',
    },
    {
      key: 'purpose',
      header: 'Purpose',
      cell: (item) => (
        <span className="capitalize">{item.purpose?.replace(/_/g, ' ') || 'Payment'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (item) => (
        <span className="font-medium">
          {item.currency} {Number(item.amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'bank',
      header: 'Bank',
      cell: (item) => item.bank_account?.name || '-',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'receipt',
      header: 'Receipt',
      cell: (item) => item.receipt_url ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            window.open(item.receipt_url, '_blank');
          }}
        >
          <FileText className="h-4 w-4" />
        </Button>
      ) : null,
    },
  ];

  const exportToCSV = () => {
    if (!filteredPayments) return;
    
    const headers = ['Date', 'PO Number', 'Supplier', 'Purpose', 'Amount', 'Currency', 'Status'];
    const rows = filteredPayments.map(p => [
      format(new Date(p.date), 'yyyy-MM-dd'),
      p.purchase_order?.po_number || '',
      p.supplier?.supplier_name || '',
      p.purpose || '',
      p.amount,
      p.currency,
      p.status,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Payments"
        description="Track and manage payments to suppliers and factories"
      >
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <PaymentAllocationDialog type="supplier_payment" />
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Paid"
          value={`$${(stats?.totalPaid || 0).toLocaleString()}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Pending"
          value={`$${(stats?.pending || 0).toLocaleString()}`}
          icon={Clock}
          description={stats?.pending ? 'Awaiting payment' : undefined}
        />
        <MetricCard
          title="Transactions"
          value={stats?.count || 0}
          icon={CheckCircle}
        />
        <MetricCard
          title="Due This Week"
          value="$0"
          icon={AlertTriangle}
          description="Upcoming payments"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by supplier, PO, reference..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
          className="w-[150px]"
          placeholder="From"
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
          className="w-[150px]"
          placeholder="To"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredPayments || []}
        loading={isLoading}
        emptyTitle="No payments found"
        emptyDescription="Supplier payments will appear here once recorded."
      />
    </div>
  );
}
