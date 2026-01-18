import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from 'react-router-dom';
import {
  Package,
  Truck,
  MessageSquare,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  useCustomerPortalAccess,
  useCustomerOrders,
  useCustomerShipments,
  useCustomerServiceRequests,
} from '@/hooks/useCustomerPortal';
import { format } from 'date-fns';

export default function CustomerDashboard() {
  const { data: portalAccess } = useCustomerPortalAccess();
  const { data: orders, isLoading: loadingOrders } = useCustomerOrders();
  const { data: shipments, isLoading: loadingShipments } = useCustomerShipments();
  const { data: serviceRequests, isLoading: loadingRequests } = useCustomerServiceRequests();

  const activeOrders = orders?.filter((o) => !['delivered', 'cancelled'].includes(o.status)) || [];
  const inTransitShipments = shipments?.filter((s) => s.status === 'in_transit') || [];
  const openRequests = serviceRequests?.filter((r) => r.status === 'open') || [];

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {portalAccess?.customer?.contact_person}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your orders and shipments with{' '}
          <span className="font-medium text-foreground">
            {portalAccess?.customer?.company_name}
          </span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {orders?.length || 0} total orders
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingShipments ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{inTransitShipments.length}</div>
                <p className="text-xs text-muted-foreground">
                  {shipments?.length || 0} total shipments
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{openRequests.length}</div>
                <p className="text-xs text-muted-foreground">Support tickets</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Your latest order activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/customer/orders">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : orders?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders?.slice(0, 5).map((order) => (
                  <Link
                    key={order.id}
                    to={`/customer/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.order_items?.length || 0} items •{' '}
                        {formatCurrency(order.total_value, order.currency)}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={order.status} />
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Shipments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Shipments</CardTitle>
              <CardDescription>Track your deliveries</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/customer/shipments">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingShipments ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : shipments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No shipments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shipments?.slice(0, 5).map((shipment) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        {shipment.carrier || 'Carrier TBD'}
                        {shipment.tracking_number && (
                          <Badge variant="outline" className="text-xs">
                            {shipment.tracking_number}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {shipment.origin_city} → {shipment.destination_city}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={shipment.status} />
                      {shipment.estimated_delivery && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ETA: {format(new Date(shipment.estimated_delivery), 'MMM d')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/customer/orders">
                <Package className="h-5 w-5" />
                <span>View All Orders</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/customer/shipments">
                <Truck className="h-5 w-5" />
                <span>Track Shipments</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/customer/support">
                <MessageSquare className="h-5 w-5" />
                <span>Get Support</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
