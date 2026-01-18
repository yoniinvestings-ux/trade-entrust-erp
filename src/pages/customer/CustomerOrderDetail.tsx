import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  Truck,
  MessageSquare,
} from 'lucide-react';
import { useCustomerOrderDetail } from '@/hooks/useCustomerPortal';
import { format } from 'date-fns';

export default function CustomerOrderDetail() {
  const { id } = useParams();
  const { data: order, isLoading } = useCustomerOrderDetail(id);

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg">Order not found</h3>
        <p className="text-muted-foreground mb-4">
          This order doesn't exist or you don't have access to it
        </p>
        <Button asChild>
          <Link to="/customer/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/customer/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {order.order_number}
              <StatusBadge status={order.status} className="text-sm" />
            </h1>
            <p className="text-muted-foreground">
              Placed on {format(new Date(order.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/customer/support">
            <MessageSquare className="mr-2 h-4 w-4" />
            Contact Support
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          {item.model_number && (
                            <div className="text-sm text-muted-foreground">
                              Model: {item.model_number}
                            </div>
                          )}
                          {item.specifications && (
                            <div className="text-sm text-muted-foreground">
                              {item.specifications}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price, order.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total_price, order.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-medium">
                      Order Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(order.total_value, order.currency)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={order.status} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment</span>
                <StatusBadge status={order.customer_payment_status || 'pending'} />
              </div>
            </CardContent>
          </Card>

          {/* Dates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Placed</span>
                <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
              </div>
              {order.order_confirmed_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confirmed</span>
                  <span>{format(new Date(order.order_confirmed_at), 'MMM d, yyyy')}</span>
                </div>
              )}
              {order.estimated_ship_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Ship Date</span>
                  <span>{format(new Date(order.estimated_ship_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {order.estimated_delivery_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Delivery</span>
                  <span className="font-medium text-primary">
                    {format(new Date(order.estimated_delivery_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              {order.shipped_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipped</span>
                  <span>{format(new Date(order.shipped_at), 'MMM d, yyyy')}</span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivered</span>
                  <span className="text-green-600 font-medium">
                    {format(new Date(order.delivered_at), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Terms</span>
                <span>{order.payment_terms || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trade Term</span>
                <Badge variant="outline">{order.trade_term || '-'}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deposit</span>
                <span>
                  {order.customer_deposit_amount
                    ? formatCurrency(order.customer_deposit_amount, order.currency)
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance</span>
                <span>
                  {order.customer_balance_amount
                    ? formatCurrency(order.customer_balance_amount, order.currency)
                    : '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Button className="w-full" variant="outline" asChild>
                <Link to="/customer/shipments">
                  <Truck className="mr-2 h-4 w-4" />
                  Track Shipments
                </Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link to="/customer/support">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Request Support
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
