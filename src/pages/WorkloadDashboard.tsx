import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Clock, DollarSign, Briefcase, TrendingUp, Package } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function WorkloadDashboard() {
  // Fetch time entries with user info
  const { data: timeEntries, isLoading: loadingEntries } = useQuery({
    queryKey: ['time-entries-dashboard'],
    queryFn: async () => {
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          orders (order_number, customer_id, customers (company_name)),
          profiles:user_id (display_name, department)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch employee workload summary
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employee-workload'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, department')
        .eq('is_active', true);
      
      if (error) throw error;

      // Get order counts per employee
      const { data: orders } = await supabase
        .from('orders')
        .select('created_by, id')
        .not('status', 'eq', 'cancelled');

      // Calculate workload per employee
      const workloadMap = new Map<string, { orders: number; hours: number }>();
      
      orders?.forEach(order => {
        if (order.created_by) {
          const current = workloadMap.get(order.created_by) || { orders: 0, hours: 0 };
          workloadMap.set(order.created_by, { ...current, orders: current.orders + 1 });
        }
      });

      // Add hours from time entries
      timeEntries?.forEach(entry => {
        const current = workloadMap.get(entry.user_id) || { orders: 0, hours: 0 };
        workloadMap.set(entry.user_id, { 
          ...current, 
          hours: current.hours + Number(entry.hours_spent || 0) 
        });
      });

      return profiles?.map(p => ({
        ...p,
        active_orders: workloadMap.get(p.user_id)?.orders || 0,
        hours_this_month: workloadMap.get(p.user_id)?.hours || 0,
      }));
    },
    enabled: !!timeEntries,
  });

  // Fetch order profit summary
  const { data: orderProfits, isLoading: loadingProfits } = useQuery({
    queryKey: ['order-profits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total_value, profit_margin, status, customers (company_name)')
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate summary metrics
  const totalHoursThisMonth = timeEntries?.reduce((sum, e) => sum + Number(e.hours_spent || 0), 0) || 0;
  const totalOrders = orderProfits?.length || 0;
  const totalRevenue = orderProfits?.reduce((sum, o) => sum + Number(o.total_value || 0), 0) || 0;
  const totalProfit = orderProfits?.reduce((sum, o) => {
    const value = Number(o.total_value || 0);
    const margin = Number(o.profit_margin || 0);
    return sum + (value * margin / 100);
  }, 0) || 0;
  const avgMargin = orderProfits?.length 
    ? orderProfits.reduce((sum, o) => sum + Number(o.profit_margin || 0), 0) / orderProfits.length 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      order_handling: 'Order Handling',
      sourcing: 'Sourcing',
      qc: 'Quality Control',
      follow_up: 'Follow Up',
      customer_communication: 'Customer Comm.',
      production_monitoring: 'Production',
      shipping_coordination: 'Shipping',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (loadingEntries || loadingEmployees || loadingProfits) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Workload & Profitability" description="Loading..." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Workload & Profitability"
        description="Track team workload, labor costs, and order profitability"
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Hours This Month"
          value={totalHoursThisMonth.toFixed(1)}
          icon={Clock}
          description="Total logged hours"
        />
        <MetricCard
          title="Active Employees"
          value={employees?.filter(e => e.hours_this_month > 0).length || 0}
          icon={Users}
          description="Logged time this month"
        />
        <MetricCard
          title="Total Profit"
          value={formatCurrency(totalProfit)}
          icon={DollarSign}
          description="From active orders"
        />
        <MetricCard
          title="Avg Margin"
          value={`${avgMargin.toFixed(1)}%`}
          icon={TrendingUp}
          description="Across all orders"
        />
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Team Workload</TabsTrigger>
          <TabsTrigger value="time-entries">Time Entries</TabsTrigger>
          <TabsTrigger value="profitability">Order Profitability</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Team Workload Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Active Orders</TableHead>
                    <TableHead className="text-right">Hours (MTD)</TableHead>
                    <TableHead className="text-right">Avg Hours/Day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((employee) => {
                    const workingDays = new Date().getDate(); // Simplified
                    const avgHoursPerDay = workingDays > 0 ? employee.hours_this_month / workingDays : 0;
                    
                    return (
                      <TableRow key={employee.user_id}>
                        <TableCell className="font-medium">{employee.display_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.department || 'Unassigned'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{employee.active_orders}</TableCell>
                        <TableCell className="text-right">{employee.hours_this_month.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{avgHoursPerDay.toFixed(1)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(!employees || employees.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No employee data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time-entries">
          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries?.slice(0, 20).map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), 'MMM dd')}</TableCell>
                      <TableCell className="font-medium">
                        {entry.profiles?.display_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getActivityLabel(entry.activity_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.orders ? (
                          <span className="text-sm">
                            {entry.orders.order_number}
                            <span className="text-muted-foreground ml-1">
                              ({entry.orders.customers?.company_name})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{entry.hours_spent}h</TableCell>
                    </TableRow>
                  ))}
                  {(!timeEntries || timeEntries.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No time entries this month
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability">
          <Card>
            <CardHeader>
              <CardTitle>Order Profitability</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderProfits?.map((order: any) => {
                    const profit = Number(order.total_value || 0) * Number(order.profit_margin || 0) / 100;
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.customers?.company_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(order.total_value || 0)}</TableCell>
                        <TableCell className="text-right">
                          <span className={Number(order.profit_margin) >= 20 ? 'text-green-600' : 'text-yellow-600'}>
                            {Number(order.profit_margin || 0).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(profit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!orderProfits || orderProfits.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No orders found
                      </TableCell>
                    </TableRow>
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
