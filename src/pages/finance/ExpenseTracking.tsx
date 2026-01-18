import { useState } from 'react';
import { useExpenses, useExpenseStats, useExpenseCategories } from '@/hooks/useFinance';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddExpenseDialog } from '@/components/finance/AddExpenseDialog';
import { DollarSign, TrendingUp, FolderOpen, ClipboardCheck, Download, Search, FileText, PieChart } from 'lucide-react';
import { format } from 'date-fns';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function ExpenseTracking() {
  const [filters, setFilters] = useState({
    categoryId: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const { data: expenses, isLoading } = useExpenses({
    categoryId: filters.categoryId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });
  const { data: stats } = useExpenseStats();
  const { data: categories } = useExpenseCategories();

  const filteredExpenses = expenses?.filter(e => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      e.notes?.toLowerCase().includes(search) ||
      e.category?.name?.toLowerCase().includes(search)
    );
  });

  // Category breakdown for chart
  const categoryBreakdown = expenses?.reduce((acc, expense) => {
    const catName = expense.category?.name || 'Uncategorized';
    acc[catName] = (acc[catName] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  const pieData = categoryBreakdown
    ? Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const columns: Column<any>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: (item) => format(new Date(item.date), 'MMM dd, yyyy'),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span>{item.category?.name || 'Uncategorized'}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (item) => (
        <span className="max-w-[300px] truncate block">{item.notes || '-'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (item) => (
        <span className="font-medium text-red-600">
          -{item.currency} {Number(item.amount).toLocaleString()}
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
    if (!filteredExpenses) return;
    
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Currency', 'Status'];
    const rows = filteredExpenses.map(e => [
      format(new Date(e.date), 'yyyy-MM-dd'),
      e.category?.name || 'Uncategorized',
      e.notes || '',
      e.amount,
      e.currency,
      e.status,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Tracking"
        description="Track and categorize business expenses"
      >
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <AddExpenseDialog />
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total MTD"
          value={`$${(stats?.totalMTD || 0).toLocaleString()}`}
          icon={DollarSign}
        />
        <MetricCard
          title="vs Last Month"
          value="+0%"
          icon={TrendingUp}
          description="Comparison"
        />
        <MetricCard
          title="Categories"
          value={categories?.length || 0}
          icon={FolderOpen}
        />
        <MetricCard
          title="Pending Approval"
          value={stats?.pendingApproval || 0}
          icon={ClipboardCheck}
          description={stats?.pendingApproval ? 'Needs review' : undefined}
        />
      </div>

      {/* Chart and Table Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Category Breakdown Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              By Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No expense data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Filters and Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.categoryId}
              onValueChange={(value) => setFilters(prev => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-[150px]"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-[150px]"
            />
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={filteredExpenses || []}
            loading={isLoading}
            emptyTitle="No expenses found"
            emptyDescription="Add your first expense to start tracking."
          />
        </div>
      </div>
    </div>
  );
}
