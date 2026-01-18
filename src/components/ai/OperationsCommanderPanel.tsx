import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Shield,
  DollarSign,
  Package,
  Target,
  Truck,
  ClipboardCheck,
  Factory,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { useOperationsAdvisor } from '@/hooks/useOperationsAdvisor';
import { AlertItem } from './AlertItem';
import { DepartmentScoreCard } from './DepartmentScoreCard';
import { cn } from '@/lib/utils';

const departmentConfig = {
  finance: { name: 'Finance', icon: DollarSign, route: '/dashboard/finance' },
  orders: { name: 'Orders', icon: Package, route: '/dashboard/orders' },
  sales: { name: 'Sales', icon: Target, route: '/dashboard/leads' },
  logistics: { name: 'Logistics', icon: Truck, route: '/dashboard/shipments' },
  qc: { name: 'QC', icon: ClipboardCheck, route: '/dashboard/qc' },
  sourcing: { name: 'Sourcing', icon: Factory, route: '/dashboard/sourcing' },
  hr: { name: 'HR', icon: Users, route: '/dashboard/finance/salaries' },
};

export function OperationsCommanderPanel() {
  const navigate = useNavigate();
  const { data, isLoading, refetch, isFetching } = useOperationsAdvisor('all');
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const getOverallStatus = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (score >= 60) return { text: 'Good', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    if (score >= 40) return { text: 'Needs Attention', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { text: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10' };
  };

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallScore = data?.overallScore ?? 0;
  const status = getOverallStatus(overallScore);
  const criticalAlerts = data?.alerts?.filter(a => a.type === 'critical') || [];
  const urgentAlerts = data?.alerts?.filter(a => a.type === 'urgent') || [];
  const displayedAlerts = showAllAlerts 
    ? data?.alerts || []
    : [...criticalAlerts, ...urgentAlerts].slice(0, 5);

  return (
    <Card className="col-span-full overflow-hidden border-2 border-primary/20">
      <CardHeader className={cn('pb-4', status.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-3">
                🎖️ Operations Commander
                <Badge variant="outline" className={cn('text-lg font-bold', status.color)}>
                  {overallScore}%
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Company Health: <span className={cn('font-semibold', status.color)}>{status.text}</span>
                {data?.analyzedAt && (
                  <span className="ml-2 opacity-75">
                    • Updated {new Date(data.analyzedAt).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Department Scores Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {Object.entries(departmentConfig).map(([key, config]) => {
            const score = data?.departmentScores?.[key] ?? 0;
            const alertCount = data?.alerts?.filter(a => a.department === key).length ?? 0;
            return (
              <DepartmentScoreCard
                key={key}
                name={config.name}
                score={score}
                icon={config.icon}
                alertCount={alertCount}
                onClick={() => navigate(config.route)}
              />
            );
          })}
        </div>

        {/* Critical & Urgent Alerts */}
        {(criticalAlerts.length > 0 || urgentAlerts.length > 0) && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Priority Alerts
                {criticalAlerts.length > 0 && (
                  <Badge variant="destructive">{criticalAlerts.length} Critical</Badge>
                )}
                {urgentAlerts.length > 0 && (
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-600">
                    {urgentAlerts.length} Urgent
                  </Badge>
                )}
              </h3>
              {(data?.alerts?.length || 0) > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                >
                  {showAllAlerts ? 'Show Less' : `View All (${data?.alerts?.length})`}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {displayedAlerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis / Commander's Orders */}
        {data?.aiAnalysis && (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              Commander's Orders
            </h3>
            <div className="prose prose-sm max-w-none text-foreground">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {data.aiAnalysis}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {data?.departmentData && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.departmentData.finance && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  Overdue Payments
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ${(data.departmentData.finance.overdueAmount || 0).toLocaleString()}
                  </span>
                  {data.departmentData.finance.overduePayments > 0 && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            )}
            {data.departmentData.orders && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Package className="h-4 w-4" />
                  Active Orders
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {data.departmentData.orders.totalActive}
                  </span>
                  {data.departmentData.orders.withoutPO > 0 && (
                    <span className="text-sm text-orange-500">
                      ({data.departmentData.orders.withoutPO} need PO)
                    </span>
                  )}
                </div>
              </div>
            )}
            {data.departmentData.sales && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Target className="h-4 w-4" />
                  Pipeline Value
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ${(data.departmentData.sales.pipelineValue || 0).toLocaleString()}
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
            )}
            {data.departmentData.qc && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <ClipboardCheck className="h-4 w-4" />
                  Open Issues
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {(data.departmentData.qc.openNCRs || 0) + (data.departmentData.qc.openServiceRequests || 0)}
                  </span>
                  {data.departmentData.qc.failedInspections > 0 && (
                    <span className="text-sm text-red-500">
                      ({data.departmentData.qc.failedInspections} failed QC)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
