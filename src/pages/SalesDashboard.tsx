import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Users, ShoppingCart, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-yellow-500' },
  { value: 'won', label: 'Won', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export default function SalesDashboard() {
  // Fetch leads summary
  const { data: leads } = useQuery({
    queryKey: ['leads-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders summary
  const { data: orders } = useQuery({
    queryKey: ['orders-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(company_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Fetch customers summary
  const { data: customers } = useQuery({
    queryKey: ['customers-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalLeads = leads?.length || 0;
  const newLeads = leads?.filter(l => l.status === 'new').length || 0;
  const qualifiedLeads = leads?.filter(l => l.status === 'qualified').length || 0;
  const wonLeads = leads?.filter(l => l.status === 'won').length || 0;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;

  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_value || 0), 0) || 0;
  const activeCustomers = customers?.length || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = LEAD_STATUSES.find(s => s.value === status);
    return (
      <Badge variant="secondary" className={`${statusConfig?.color} text-white`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  // Lead status breakdown
  const leadsByStatus = LEAD_STATUSES.map(status => ({
    ...status,
    count: leads?.filter(l => l.status === status.value).length || 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Sales Manager Dashboard" 
        description="Overview of sales pipeline and performance"
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Leads"
          value={totalLeads.toString()}
          icon={Target}
          trend={{ value: newLeads, isPositive: true }}
          description={`${newLeads} new this month`}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
          description="leads to customers"
        />
        <MetricCard
          title="Active Customers"
          value={activeCustomers.toString()}
          icon={Users}
          description="total customers"
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          trend={{ value: 12, isPositive: true }}
          description="from orders"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pipeline Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadsByStatus.map(status => (
                <div key={status.value} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status.color}`} />
                    <span className="text-sm">{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{status.count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({totalLeads > 0 ? ((status.count / totalLeads) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.slice(0, 5).map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.company_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.contact_person}</TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>
                      <span className={lead.score >= 70 ? 'text-green-600' : 'text-muted-foreground'}>
                        {lead.score || 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.slice(0, 5).map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono">{order.order_number}</TableCell>
                  <TableCell>{order.customer?.company_name}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(order.total_value || 0)}</TableCell>
                  <TableCell>
                    <span className={(order.profit_margin || 0) > 20 ? 'text-green-600' : 'text-yellow-600'}>
                      {(order.profit_margin || 0).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
