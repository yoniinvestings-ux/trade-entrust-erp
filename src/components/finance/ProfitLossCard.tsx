import { useProfitLoss } from '@/hooks/useFinance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProfitLossCardProps {
  period?: { from: string; to: string };
}

export function ProfitLossCard({ period }: ProfitLossCardProps) {
  const { data, isLoading } = useProfitLoss(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const isProfit = (data?.netProfit || 0) >= 0;

  const rows = [
    { label: 'Revenue', value: data?.revenue || 0, type: 'income' as const },
    { label: 'Supplier Costs', value: data?.supplierCosts || 0, type: 'expense' as const },
    { label: 'Operating Expenses', value: data?.expenses || 0, type: 'expense' as const },
    { label: 'Salaries', value: data?.salaries || 0, type: 'expense' as const },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Profit & Loss
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">{row.label}</span>
            <span className={cn(
              'font-medium',
              row.type === 'income' ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {row.type === 'expense' && '-'}${row.value.toLocaleString()}
            </span>
          </div>
        ))}
        
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Net Profit/Loss</span>
            <div className={cn(
              'flex items-center gap-1 text-lg font-bold',
              isProfit ? 'text-green-600' : 'text-red-600'
            )}>
              {isProfit ? (
                <TrendingUp className="h-5 w-5" />
              ) : data?.netProfit === 0 ? (
                <Minus className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              <span>
                {isProfit ? '+' : '-'}${Math.abs(data?.netProfit || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="mt-4 pt-3 border-t space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Quick Insights</h4>
          {data && data.revenue > 0 && (
            <>
              <div className="text-sm flex justify-between">
                <span>Gross Margin</span>
                <span className="font-medium">
                  {(((data.revenue - data.supplierCosts) / data.revenue) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-sm flex justify-between">
                <span>Operating Margin</span>
                <span className="font-medium">
                  {((data.netProfit / data.revenue) * 100).toFixed(1)}%
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
