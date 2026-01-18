import { useAuth } from '@/lib/auth';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { ShoppingCart, Users, Target, DollarSign, Package, TrendingUp, ClipboardCheck, Truck } from 'lucide-react';
import { OperationsCommanderPanel } from '@/components/ai/OperationsCommanderPanel';
import { useDashboardStats, useRecentActivity } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissionCheck } from '@/hooks/usePermissions';

export default function Dashboard() {
  const { profile, role } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();
  const { hasPermission } = usePermissionCheck();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Check which metrics the user can see based on permissions
  const canViewOrders = hasPermission('orders', 'view');
  const canViewCustomers = hasPermission('customers', 'view');
  const canViewLeads = hasPermission('leads', 'view');
  const canViewFinance = hasPermission('finance', 'view');
  const canViewSuppliers = hasPermission('suppliers', 'view');
  const canViewPurchaseOrders = hasPermission('purchase_orders', 'view');
  const canViewQC = hasPermission('qc', 'view');
  const canViewShipments = hasPermission('shipments', 'view');

  // Count visible primary metrics
  const visiblePrimaryMetrics = [canViewOrders, canViewCustomers, canViewLeads, canViewFinance].filter(Boolean).length;
  const visibleSecondaryMetrics = [canViewSuppliers, canViewPurchaseOrders, canViewQC, canViewShipments].filter(Boolean).length;

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title={`Welcome back, ${profile?.display_name || 'User'}!`}
        description="Here's an overview of your operations today."
      />

      {/* AI Operations Commander */}
      <OperationsCommanderPanel />

      {/* Primary Metrics Grid - Only show metrics user has permission to view */}
      {visiblePrimaryMetrics > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(visiblePrimaryMetrics, 4)} gap-6 mb-8`}>
          {statsLoading ? (
            <>
              {[...Array(visiblePrimaryMetrics)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              {canViewOrders && (
                <MetricCard
                  title="Total Orders"
                  value={String(stats?.totalOrders || 0)}
                  icon={ShoppingCart}
                  trend={stats?.ordersTrend !== undefined ? { 
                    value: Math.abs(stats.ordersTrend), 
                    isPositive: stats.ordersTrend >= 0 
                  } : undefined}
                  description="vs last month"
                />
              )}
              {canViewCustomers && (
                <MetricCard
                  title="Active Customers"
                  value={String(stats?.activeCustomers || 0)}
                  icon={Users}
                  trend={stats?.customersTrend !== undefined ? { 
                    value: Math.abs(stats.customersTrend), 
                    isPositive: stats.customersTrend >= 0 
                  } : undefined}
                  description="vs last month"
                />
              )}
              {canViewLeads && (
                <MetricCard
                  title="Open Leads"
                  value={String(stats?.openLeads || 0)}
                  icon={Target}
                  trend={stats?.leadsTrend !== undefined ? { 
                    value: Math.abs(stats.leadsTrend), 
                    isPositive: stats.leadsTrend >= 0 
                  } : undefined}
                  description="active prospects"
                />
              )}
              {canViewFinance && (
                <MetricCard
                  title="Revenue (MTD)"
                  value={formatCurrency(stats?.revenueMTD || 0)}
                  icon={DollarSign}
                  trend={stats?.revenueTrend !== undefined ? { 
                    value: Math.abs(stats.revenueTrend), 
                    isPositive: stats.revenueTrend >= 0 
                  } : undefined}
                  description="vs last month"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Secondary Metrics - Only show metrics user has permission to view */}
      {visibleSecondaryMetrics > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(visibleSecondaryMetrics, 4)} gap-6 mb-8`}>
          {statsLoading ? (
            <>
              {[...Array(visibleSecondaryMetrics)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              {canViewSuppliers && (
                <MetricCard 
                  title="Active Suppliers" 
                  value={String(stats?.activeSuppliers || 0)} 
                  icon={Package} 
                  description="registered suppliers" 
                />
              )}
              {canViewPurchaseOrders && (
                <MetricCard 
                  title="Pending POs" 
                  value={String(stats?.pendingPOs || 0)} 
                  icon={TrendingUp} 
                  description="awaiting completion" 
                />
              )}
              {canViewQC && (
                <MetricCard 
                  title="QC This Week" 
                  value={String(stats?.qcThisWeek || 0)} 
                  icon={ClipboardCheck} 
                  description="inspections scheduled" 
                />
              )}
              {canViewShipments && (
                <MetricCard 
                  title="In Transit" 
                  value={String(stats?.inTransit || 0)} 
                  icon={Truck} 
                  description="shipments" 
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Show message if no metrics are visible */}
      {visiblePrimaryMetrics === 0 && visibleSecondaryMetrics === 0 && (
        <div className="bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">
            No dashboard metrics available for your current permissions.
          </p>
        </div>
      )}

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {activityLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity. Start by creating orders, leads, or shipments.
            </p>
          )}
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4">Your Role: <span className="text-primary capitalize">{role?.replace('_', ' ') || 'Not assigned'}</span></h3>
          <p className="text-muted-foreground text-sm mb-4">
            Use the sidebar to navigate through different modules. You have access to features based on your assigned role and permissions.
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Quick Tips</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd> for quick search</li>
              <li>• Click on any row to view details</li>
              <li>• Use filters to narrow down results</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
