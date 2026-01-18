import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, startOfWeek, endOfWeek, format } from 'date-fns';

interface DashboardStats {
  totalOrders: number;
  activeCustomers: number;
  openLeads: number;
  revenueMTD: number;
  activeSuppliers: number;
  pendingPOs: number;
  qcThisWeek: number;
  inTransit: number;
  // Trends
  ordersTrend: number;
  customersTrend: number;
  leadsTrend: number;
  revenueTrend: number;
}

interface RecentActivity {
  type: 'order' | 'lead' | 'qc' | 'shipment' | 'po';
  action: string;
  detail: string;
  time: string;
  timestamp: Date;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = startOfMonth(now);

      // Execute all queries in parallel
      const [
        ordersResult,
        ordersLastMonthResult,
        customersResult,
        customersLastMonthResult,
        leadsResult,
        leadsLastMonthResult,
        revenueResult,
        revenueLastMonthResult,
        suppliersResult,
        pendingPOsResult,
        qcResult,
        shipmentsResult,
      ] = await Promise.all([
        // Total orders (current month, excluding cancelled)
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'cancelled'),
        
        // Orders last month
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'cancelled')
          .gte('created_at', lastMonthStart.toISOString())
          .lt('created_at', lastMonthEnd.toISOString()),
        
        // Active customers (with at least one active order)
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        
        // Customers last month
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .lt('created_at', lastMonthEnd.toISOString()),
        
        // Open leads
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', '("converted","lost")'),
        
        // Leads last month
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', '("converted","lost")')
          .lt('created_at', lastMonthEnd.toISOString()),
        
        // Revenue MTD
        supabase
          .from('orders')
          .select('total_value')
          .neq('status', 'cancelled')
          .gte('created_at', currentMonthStart.toISOString()),
        
        // Revenue last month
        supabase
          .from('orders')
          .select('total_value')
          .neq('status', 'cancelled')
          .gte('created_at', lastMonthStart.toISOString())
          .lt('created_at', lastMonthEnd.toISOString()),
        
        // Active suppliers
        supabase
          .from('suppliers')
          .select('id', { count: 'exact', head: true }),
        
        // Pending POs
        supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['draft', 'pending', 'confirmed', 'in_production']),
        
        // QC inspections this week
        supabase
          .from('qc_inspections')
          .select('id', { count: 'exact', head: true })
          .gte('scheduled_date', startOfWeek(now).toISOString())
          .lte('scheduled_date', endOfWeek(now).toISOString()),
        
        // Shipments in transit
        supabase
          .from('shipments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'in_transit'),
      ]);

      // Calculate current values
      const totalOrders = ordersResult.count || 0;
      const ordersLastMonth = ordersLastMonthResult.count || 0;
      
      const activeCustomers = customersResult.count || 0;
      const customersLastMonth = customersLastMonthResult.count || 0;
      
      const openLeads = leadsResult.count || 0;
      const leadsLastMonth = leadsLastMonthResult.count || 0;
      
      const revenueMTD = revenueResult.data?.reduce((sum, o) => sum + (o.total_value || 0), 0) || 0;
      const revenueLastMonth = revenueLastMonthResult.data?.reduce((sum, o) => sum + (o.total_value || 0), 0) || 0;

      // Calculate trends (percentage change)
      const calculateTrend = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        totalOrders,
        activeCustomers,
        openLeads,
        revenueMTD,
        activeSuppliers: suppliersResult.count || 0,
        pendingPOs: pendingPOsResult.count || 0,
        qcThisWeek: qcResult.count || 0,
        inTransit: shipmentsResult.count || 0,
        ordersTrend: calculateTrend(totalOrders, ordersLastMonth),
        customersTrend: calculateTrend(activeCustomers, customersLastMonth),
        leadsTrend: calculateTrend(openLeads, leadsLastMonth),
        revenueTrend: calculateTrend(revenueMTD, revenueLastMonth),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async (): Promise<RecentActivity[]> => {
      const activities: RecentActivity[] = [];

      // Fetch recent items from multiple tables in parallel
      const [ordersResult, leadsResult, qcResult, shipmentsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('order_number, status, created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('leads')
          .select('company_name, status, created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('qc_inspections')
          .select('status, order_id, orders(order_number), created_at')
          .order('created_at', { ascending: false })
          .limit(3),
        
        supabase
          .from('shipments')
          .select('tracking_number, status, orders(order_number), updated_at')
          .order('updated_at', { ascending: false })
          .limit(3),
      ]);

      // Process orders
      ordersResult.data?.forEach(order => {
        activities.push({
          type: 'order',
          action: order.status === 'new' ? 'New order created' : `Order ${order.status}`,
          detail: order.order_number,
          time: formatRelativeTime(new Date(order.updated_at || order.created_at)),
          timestamp: new Date(order.updated_at || order.created_at),
        });
      });

      // Process leads
      leadsResult.data?.forEach(lead => {
        const actionMap: Record<string, string> = {
          new: 'New lead added',
          contacted: 'Lead contacted',
          qualified: 'Lead qualified',
          proposal: 'Proposal sent',
          negotiation: 'In negotiation',
          converted: 'Lead converted',
          lost: 'Lead lost',
        };
        activities.push({
          type: 'lead',
          action: actionMap[lead.status] || `Lead ${lead.status}`,
          detail: lead.company_name,
          time: formatRelativeTime(new Date(lead.updated_at || lead.created_at)),
          timestamp: new Date(lead.updated_at || lead.created_at),
        });
      });

      // Process QC inspections
      qcResult.data?.forEach(qc => {
        const orderNum = (qc.orders as any)?.order_number || 'Unknown';
        activities.push({
          type: 'qc',
          action: qc.status === 'passed' ? 'QC passed' : qc.status === 'failed' ? 'QC failed' : `QC ${qc.status}`,
          detail: orderNum,
          time: formatRelativeTime(new Date(qc.created_at)),
          timestamp: new Date(qc.created_at),
        });
      });

      // Process shipments
      shipmentsResult.data?.forEach(shipment => {
        const orderNum = (shipment.orders as any)?.order_number || shipment.tracking_number || 'Unknown';
        const actionMap: Record<string, string> = {
          pending: 'Shipment pending',
          in_transit: 'Shipment in transit',
          delivered: 'Shipment delivered',
          cancelled: 'Shipment cancelled',
        };
        activities.push({
          type: 'shipment',
          action: actionMap[shipment.status] || `Shipment ${shipment.status}`,
          detail: orderNum,
          time: formatRelativeTime(new Date(shipment.updated_at)),
          timestamp: new Date(shipment.updated_at),
        });
      });

      // Sort by timestamp and take the most recent
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 8);
    },
    refetchInterval: 30000,
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return format(date, 'MMM d');
}
