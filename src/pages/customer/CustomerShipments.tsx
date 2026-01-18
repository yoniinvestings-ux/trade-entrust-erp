import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Truck, MapPin, Calendar, ExternalLink, Package } from 'lucide-react';
import { useCustomerShipments } from '@/hooks/useCustomerPortal';
import { format } from 'date-fns';

export default function CustomerShipments() {
  const { data: shipments, isLoading } = useCustomerShipments();

  const getTrackingUrl = (carrier: string | null, trackingNumber: string | null) => {
    if (!carrier || !trackingNumber) return null;

    const carrierUrls: Record<string, string> = {
      dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      maersk: `https://www.maersk.com/tracking/${trackingNumber}`,
    };

    const carrierLower = carrier.toLowerCase();
    for (const [key, url] of Object.entries(carrierUrls)) {
      if (carrierLower.includes(key)) return url;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shipments</h1>
        <p className="text-muted-foreground">Track all your shipments and deliveries</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            All Shipments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : shipments?.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">No shipments yet</h3>
              <p className="text-muted-foreground">
                Shipments will appear here once your orders are shipped
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {shipments?.map((shipment) => {
                const trackingUrl = getTrackingUrl(shipment.carrier, shipment.tracking_number);

                return (
                  <div
                    key={shipment.id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {shipment.carrier || 'Carrier Pending'}
                          </span>
                          <StatusBadge status={shipment.status} />
                        </div>
                        {shipment.tracking_number && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {shipment.tracking_number}
                            </Badge>
                            {trackingUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                asChild
                              >
                                <a
                                  href={trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Track
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {shipment.orders && (
                        <Badge variant="secondary">
                          <Package className="mr-1 h-3 w-3" />
                          {(shipment.orders as any).order_number}
                        </Badge>
                      )}
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {shipment.origin_city}
                          {shipment.origin_country && `, ${shipment.origin_country}`}
                        </span>
                      </div>
                      <div className="flex-1 border-t border-dashed" />
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {shipment.destination_city}
                          {shipment.destination_country && `, ${shipment.destination_country}`}
                        </span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex gap-6 text-sm">
                      {shipment.estimated_delivery && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Est. Delivery:</span>
                          <span className="font-medium">
                            {format(new Date(shipment.estimated_delivery), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      {shipment.actual_delivery && (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <Calendar className="h-4 w-4" />
                          <span>Delivered:</span>
                          <span className="font-medium">
                            {format(new Date(shipment.actual_delivery), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
