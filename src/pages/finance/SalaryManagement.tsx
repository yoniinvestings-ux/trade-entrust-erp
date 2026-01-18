import { useState } from 'react';
import { useSalaryRecords, useSalaryStats, useEmployees } from '@/hooks/useFinance';
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
import { SalaryRecordDialog } from '@/components/finance/SalaryRecordDialog';
import { EmployeeFormDialog } from '@/components/finance/EmployeeFormDialog';
import { DollarSign, Users, Clock, CheckCircle, Download, Search, Calculator, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function SalaryManagement() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });

  const { data: salaryRecords, isLoading } = useSalaryRecords({ month: selectedMonth });
  const { data: stats } = useSalaryStats();
  const { data: employees } = useEmployees();

  // Combine employees with their salary status for the month
  const payrollData = employees?.map(emp => {
    const salaryRecord = salaryRecords?.find(s => s.employee_id === emp.id);
    return {
      id: emp.id,
      employee: emp,
      salaryRecord,
      status: salaryRecord ? 'paid' : 'pending',
    };
  });

  const filteredPayroll = payrollData?.filter(p => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!p.employee.full_name.toLowerCase().includes(search)) return false;
    }
    if (filters.status && filters.status !== 'all') {
      if (p.status !== filters.status) return false;
    }
    return true;
  });

  const columns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (item) => (
        <div>
          <p className="font-medium">{item.employee.full_name}</p>
          <p className="text-sm text-muted-foreground">
            {item.employee.position} • {item.employee.department}
          </p>
        </div>
      ),
    },
    {
      key: 'base_salary',
      header: 'Base (USD)',
      cell: (item) => (
        <span className="font-medium">
          ${item.employee.base_salary_usd.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'rmb_amount',
      header: 'RMB Paid',
      cell: (item) => item.salaryRecord ? (
        <span className="font-medium text-orange-600">
          ¥{Number(item.salaryRecord.amount_local).toLocaleString()}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'exchange_rate',
      header: 'Rate',
      cell: (item) => item.salaryRecord?.exchange_rate || '-',
    },
    {
      key: 'bank',
      header: 'Bank',
      cell: (item) => item.salaryRecord?.bank_account?.name || '-',
    },
    {
      key: 'payment_date',
      header: 'Paid On',
      cell: (item) => item.salaryRecord
        ? format(new Date(item.salaryRecord.date), 'MMM dd, yyyy')
        : '-',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => !item.salaryRecord && (
        <SalaryRecordDialog
          defaultEmployeeId={item.employee.id}
          trigger={
            <Button variant="outline" size="sm">
              Pay
            </Button>
          }
        />
      ),
    },
  ];

  const exportToCSV = () => {
    if (!filteredPayroll) return;
    
    const headers = ['Employee', 'Department', 'Position', 'Base USD', 'RMB Paid', 'Exchange Rate', 'Status', 'Payment Date'];
    const rows = filteredPayroll.map(p => [
      p.employee.full_name,
      p.employee.department || '',
      p.employee.position || '',
      p.employee.base_salary_usd,
      p.salaryRecord?.amount_local || '',
      p.salaryRecord?.exchange_rate || '',
      p.status,
      p.salaryRecord ? format(new Date(p.salaryRecord.date), 'yyyy-MM-dd') : '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toISOString().slice(0, 7);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Management"
        description="Manage employee salaries with USD to RMB conversion"
      >
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <EmployeeFormDialog />
        <SalaryRecordDialog />
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Payroll (USD)"
          value={`$${(stats?.totalPayrollUSD || 0).toLocaleString()}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Total Paid (RMB)"
          value={`¥${(stats?.totalPayrollRMB || 0).toLocaleString()}`}
          icon={Calculator}
        />
        <MetricCard
          title="Employees"
          value={stats?.employeeCount || 0}
          icon={Users}
        />
        <MetricCard
          title="Pending"
          value={stats?.pendingCount || 0}
          icon={Clock}
          description={stats?.pendingCount ? 'Awaiting payment' : 'All paid'}
        />
      </div>

      {/* Exchange Rate Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Current Exchange Rate</p>
                <p className="text-sm text-muted-foreground">
                  1 USD = 7.25 CNY (manual rate)
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Salaries are budgeted in USD but paid in RMB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedMonth}
          onValueChange={setSelectedMonth}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={month} value={month}>
                {format(new Date(month + '-01'), 'MMMM yyyy')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredPayroll || []}
        loading={isLoading}
        emptyTitle="No employees found"
        emptyDescription="Add employees to start managing salaries."
      />
    </div>
  );
}
