import { useState } from 'react';
import { useCustomerPaymentStats, useSupplierPaymentStats, useExpenseStats, useSalaryStats, useBankAccounts } from '@/hooks/useFinance';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CashFlowChart } from '@/components/finance/CashFlowChart';
import { ProfitLossCard } from '@/components/finance/ProfitLossCard';
import { PaymentRecordDialog } from '@/components/finance/PaymentRecordDialog';
import { AddExpenseDialog } from '@/components/finance/AddExpenseDialog';
import { SalaryRecordDialog } from '@/components/finance/SalaryRecordDialog';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function FinanceOverview() {
  const { data: customerStats } = useCustomerPaymentStats();
  const { data: supplierStats } = useSupplierPaymentStats();
  const { data: expenseStats } = useExpenseStats();
  const { data: salaryStats } = useSalaryStats();
  const { data: bankAccounts, isLoading: banksLoading } = useBankAccounts();

  const totalBalance = bankAccounts?.reduce((sum, acc) => sum + Number(acc.current_balance), 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Overview"
        description="Monitor cash flow, payments, and financial health"
      >
        <AddExpenseDialog trigger={<Button variant="outline"><Plus className="h-4 w-4 mr-2" />Expense</Button>} />
        <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Payment</Button>
        <SalaryRecordDialog trigger={<Button><Plus className="h-4 w-4 mr-2" />Salary</Button>} />
      </PageHeader>

      {/* Bank Accounts */}
      <div className="grid gap-4 md:grid-cols-3">
        {banksLoading ? (
          <>
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalBalance.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Across all accounts</p>
              </CardContent>
            </Card>
            {bankAccounts?.map((account) => (
              <Card key={account.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${Number(account.current_balance).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/dashboard/finance/customer-payments">
          <MetricCard
            title="Customer Payments"
            value={`$${(customerStats?.totalReceived || 0).toLocaleString()}`}
            icon={ArrowDownRight}
            description="Received this period"
            className="hover:border-primary transition-colors cursor-pointer"
          />
        </Link>
        <Link to="/dashboard/finance/supplier-payments">
          <MetricCard
            title="Supplier Payments"
            value={`$${(supplierStats?.totalPaid || 0).toLocaleString()}`}
            icon={ArrowUpRight}
            description="Paid this period"
            className="hover:border-primary transition-colors cursor-pointer"
          />
        </Link>
        <Link to="/dashboard/finance/expenses">
          <MetricCard
            title="Expenses MTD"
            value={`$${(expenseStats?.totalMTD || 0).toLocaleString()}`}
            icon={CreditCard}
            description={`${expenseStats?.count || 0} transactions`}
            className="hover:border-primary transition-colors cursor-pointer"
          />
        </Link>
        <Link to="/dashboard/finance/salaries">
          <MetricCard
            title="Payroll MTD"
            value={`$${(salaryStats?.totalPayrollUSD || 0).toLocaleString()}`}
            icon={DollarSign}
            description={`${salaryStats?.paidCount || 0}/${salaryStats?.employeeCount || 0} paid`}
            className="hover:border-primary transition-colors cursor-pointer"
          />
        </Link>
      </div>

      {/* Charts and P&L */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashFlowChart />
        </div>
        <div>
          <ProfitLossCard />
        </div>
      </div>

      {/* AI Insights Panel (placeholder for edge function) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Financial Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Cash Flow Healthy</p>
                <p className="text-sm text-muted-foreground">
                  Based on current trends, your 3-month cash flow projection shows positive net inflows.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/20">
                <RefreshCw className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Currency Impact</p>
                <p className="text-sm text-muted-foreground">
                  RMB salary costs are stable. Current USD/CNY rate: 7.25
                </p>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Payment Reminder</p>
                <p className="text-sm text-muted-foreground">
                  {salaryStats?.pendingCount || 0} salary payments pending for this month.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
