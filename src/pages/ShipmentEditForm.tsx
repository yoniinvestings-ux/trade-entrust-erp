import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import { ArrowLeft, Package, Ship, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SHIPMENT_STATUSES = [
  { value: 'preparing', label: 'Preparing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'customs', label: 'In Customs' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface OrderItem {
  id: string;
  product_name: string;
  model_number: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  cbm: number | null;
  gross_weight_kg: number | null;
}

interface OrderWithItems {
  id: string;
  order_number: string;
  total_value: number | null;
  currency: string | null;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

interface ShipmentItem {
  id: string;
  order_item_id: string;
  quantity_shipped: number;
}

export default function ShipmentEditForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    tracking_number: '',
    carrier: '',
    status: 'preparing',
    origin_city: '',
    origin_country: 'China',
    destination_city: '',
    destination_country: '',
    destination_street: '',
    estimated_delivery: '',
    actual_delivery: '',
    factory_city: '',
  });

  // Fetch existing shipment
  const { data: shipment, isLoading: shipmentLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          customer:customers(id, company_name, contact_person, city, country, street)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch shipment items (junction table)
  const { data: shipmentItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['shipment-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_items')
        .select('*')
        .eq('shipment_id', id);
      if (error) throw error;
      return data as ShipmentItem[];
    },
    enabled: !!id,
  });

  // Fetch linked orders
  const { data: linkedOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['shipment-linked-orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_orders')
        .select('order_id')
        .eq('shipment_id', id);
      if (error) throw error;
      return data?.map(d => d.order_id) || [];
    },
    enabled: !!id,
  });

  // Fetch all orders for the customer
  const { data: customerOrders, isLoading: customerOrdersLoading } = useQuery({
    queryKey: ['customer-orders-for-edit', shipment?.customer_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, 
          order_number, 
          total_value, 
          currency,
          status,
          created_at,
          order_items(id, product_name, model_number, quantity, unit_price, total_price, cbm, gross_weight_kg)
        `)
        .eq('customer_id', shipment?.customer_id)
        .in('status', ['confirmed', 'production', 'qc', 'shipping', 'delivered'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OrderWithItems[];
    },
    enabled: !!shipment?.customer_id,
  });

  // Initialize form with shipment data
  useEffect(() => {
    if (shipment) {
      setFormData({
        tracking_number: shipment.tracking_number || '',
        carrier: shipment.carrier || '',
        status: shipment.status || 'preparing',
        origin_city: shipment.origin_city || '',
        origin_country: shipment.origin_country || 'China',
        destination_city: shipment.destination_city || '',
        destination_country: shipment.destination_country || '',
        destination_street: shipment.destination_street || '',
        estimated_delivery: shipment.estimated_delivery ? format(new Date(shipment.estimated_delivery), 'yyyy-MM-dd') : '',
        actual_delivery: shipment.actual_delivery ? format(new Date(shipment.actual_delivery), 'yyyy-MM-dd') : '',
        factory_city: shipment.factory_city || '',
      });
    }
  }, [shipment]);

  // Initialize selected items from shipment_items
  useEffect(() => {
    if (shipmentItems) {
      setSelectedItemIds(shipmentItems.map(si => si.order_item_id));
    }
  }, [shipmentItems]);

  // Auto-expand linked orders
  useEffect(() => {
    if (linkedOrders) {
      setExpandedOrders(linkedOrders);
    }
  }, [linkedOrders]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleAllOrderItems = (order: OrderWithItems) => {
    const orderItemIds = order.order_items.map(i => i.id);
    const allSelected = orderItemIds.every(id => selectedItemIds.includes(id));
    
    if (allSelected) {
      setSelectedItemIds(prev => prev.filter(id => !orderItemIds.includes(id)));
    } else {
      setSelectedItemIds(prev => [...new Set([...prev, ...orderItemIds])]);
    }
  };

  const selectAllItems = () => {
    if (customerOrders) {
      const allItemIds = customerOrders.flatMap(o => o.order_items.map(i => i.id));
      setSelectedItemIds(allItemIds);
    }
  };

  const deselectAllItems = () => {
    setSelectedItemIds([]);
  };

  const getAffectedOrderIds = (): string[] => {
    if (!customerOrders) return [];
    const orderIds = new Set<string>();
    customerOrders.forEach(order => {
      const hasSelectedItem = order.order_items.some(item => selectedItemIds.includes(item.id));
      if (hasSelectedItem) {
        orderIds.add(order.id);
      }
    });
    return Array.from(orderIds);
  };

  const calculateTotals = () => {
    let totalValue = 0;
    let totalItems = 0;
    let totalQuantity = 0;
    let totalCbm = 0;
    let totalWeight = 0;

    customerOrders?.forEach(order => {
      order.order_items.forEach(item => {
        if (selectedItemIds.includes(item.id)) {
          totalValue += item.total_price || 0;
          totalItems++;
          totalQuantity += item.quantity || 0;
          totalCbm += item.cbm || 0;
          totalWeight += item.gross_weight_kg || 0;
        }
      });
    });

    return { totalValue, totalItems, totalQuantity, totalCbm, totalWeight };
  };

  const updateShipment = useMutation({
    mutationFn: async () => {
      const affectedOrderIds = getAffectedOrderIds();
      const totals = calculateTotals();

      // Update shipment
      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({
          tracking_number: formData.tracking_number || null,
          carrier: formData.carrier || null,
          status: formData.status,
          origin_city: formData.origin_city || null,
          origin_country: formData.origin_country || null,
          destination_city: formData.destination_city || null,
          destination_country: formData.destination_country || null,
          destination_street: formData.destination_street || null,
          estimated_delivery: formData.estimated_delivery ? new Date(formData.estimated_delivery).toISOString() : null,
          actual_delivery: formData.actual_delivery ? new Date(formData.actual_delivery).toISOString() : null,
          factory_city: formData.factory_city || null,
          total_cbm: totals.totalCbm,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (shipmentError) throw shipmentError;

      // Delete existing shipment_items and recreate
      await supabase.from('shipment_items').delete().eq('shipment_id', id);

      if (selectedItemIds.length > 0) {
        const shipmentItemRecords = selectedItemIds.map(itemId => {
          let quantity = 1;
          customerOrders?.forEach(order => {
            const item = order.order_items.find(i => i.id === itemId);
            if (item) quantity = item.quantity;
          });

          return {
            shipment_id: id!,
            order_item_id: itemId,
            quantity_shipped: quantity,
          };
        });

        const { error: itemsError } = await supabase
          .from('shipment_items')
          .insert(shipmentItemRecords);

        if (itemsError) throw itemsError;
      }

      // Delete existing shipment_orders and recreate
      await supabase.from('shipment_orders').delete().eq('shipment_id', id);

      if (affectedOrderIds.length > 0) {
        const shipmentOrderRecords = affectedOrderIds.map(orderId => ({
          shipment_id: id!,
          order_id: orderId,
        }));

        const { error: linkError } = await supabase
          .from('shipment_orders')
          .insert(shipmentOrderRecords);

        if (linkError) throw linkError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
      toast.success('Shipment updated successfully');
      navigate('/dashboard/shipments');
    },
    onError: (error: any) => {
      toast.error('Failed to update shipment: ' + error.message);
    },
  });

  const deleteShipment = useMutation({
    mutationFn: async () => {
      // Delete shipment_items first
      await supabase.from('shipment_items').delete().eq('shipment_id', id);
      // Delete shipment_orders
      await supabase.from('shipment_orders').delete().eq('shipment_id', id);
      // Delete shipment
      const { error } = await supabase.from('shipments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment deleted');
      navigate('/dashboard/shipments');
    },
    onError: (error: any) => {
      toast.error('Failed to delete shipment: ' + error.message);
    },
  });

  const handleSubmit = () => {
    if (selectedItemIds.length === 0) {
      toast.error('Please select at least one item');
      return;
    }
    updateShipment.mutate();
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const isLoading = shipmentLoading || itemsLoading || ordersLoading || customerOrdersLoading;
  const { totalValue, totalItems, totalQuantity, totalCbm, totalWeight } = calculateTotals();
  const affectedOrderIds = getAffectedOrderIds();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/shipments')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader 
            title="Edit Shipment" 
            description={`Editing shipment for ${shipment?.customer?.company_name}`}
          />
        </div>
        <Button 
          variant="destructive" 
          onClick={() => {
            if (confirm('Are you sure you want to delete this shipment?')) {
              deleteShipment.mutate();
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Shipment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order & Item Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium">{shipment?.customer?.company_name}</div>
                  <div className="text-sm text-muted-foreground">{shipment?.customer?.contact_person}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Item Selection */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Select Items to Ship
              </CardTitle>
              {customerOrders && customerOrders.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllItems}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllItems}>
                    Clear
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {customerOrders?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No orders available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerOrders?.map(order => {
                    const isExpanded = expandedOrders.includes(order.id);
                    const orderItemIds = order.order_items.map(i => i.id);
                    const selectedCount = orderItemIds.filter(id => selectedItemIds.includes(id)).length;
                    const allSelected = selectedCount === orderItemIds.length && orderItemIds.length > 0;
                    const someSelected = selectedCount > 0 && selectedCount < orderItemIds.length;

                    return (
                      <Collapsible key={order.id} open={isExpanded} onOpenChange={() => toggleOrderExpand(order.id)}>
                        <div className={`border-2 rounded-lg transition-colors ${
                          selectedCount > 0 ? 'border-primary bg-primary/5' : 'border-border'
                        }`}>
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={allSelected}
                                ref={(el) => {
                                  if (el) {
                                    (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                                  }
                                }}
                                onCheckedChange={() => toggleAllOrderItems(order)}
                              />
                              <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <div className="text-left">
                                  <div className="font-mono font-medium">{order.order_number}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {order.order_items.length} items • {order.status}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                            </div>
                            <div className="text-right">
                              {selectedCount > 0 && (
                                <Badge variant="secondary" className="mb-1">
                                  {selectedCount}/{order.order_items.length} selected
                                </Badge>
                              )}
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(order.created_at), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>

                          <CollapsibleContent>
                            <div className="border-t px-4 py-2 space-y-1 bg-muted/30">
                              {order.order_items.map(item => (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                                    selectedItemIds.includes(item.id)
                                      ? 'bg-primary/10 border border-primary/30'
                                      : 'hover:bg-muted/50'
                                  }`}
                                  onClick={() => toggleItem(item.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={selectedItemIds.includes(item.id)}
                                      onCheckedChange={() => toggleItem(item.id)}
                                    />
                                    <div>
                                      <div className="font-medium">{item.product_name}</div>
                                      {item.model_number && (
                                        <div className="text-xs text-muted-foreground">
                                          Model: {item.model_number}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right text-sm">
                                    <div>{item.quantity} units</div>
                                    <div className="text-muted-foreground">
                                      {formatCurrency(item.total_price, order.currency || 'USD')}
                                    </div>
                                    {(item.cbm || item.gross_weight_kg) && (
                                      <div className="text-xs text-muted-foreground">
                                        {item.cbm ? `${item.cbm} m³` : ''} 
                                        {item.cbm && item.gross_weight_kg ? ' • ' : ''}
                                        {item.gross_weight_kg ? `${item.gross_weight_kg} kg` : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Shipment Details & Summary */}
        <div className="space-y-6">
          {/* Shipment Summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Shipment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Items</div>
                  <div className="text-xl font-bold">{totalItems}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Units</div>
                  <div className="text-xl font-bold">{totalQuantity}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">CBM</div>
                  <div className="text-xl font-bold">{totalCbm.toFixed(3)} m³</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Weight</div>
                  <div className="text-xl font-bold">{totalWeight.toFixed(1)} kg</div>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="text-muted-foreground text-sm">Total Value</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-sm">Orders</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {affectedOrderIds.length > 0 ? (
                    customerOrders
                      ?.filter(o => affectedOrderIds.includes(o.id))
                      .map(order => (
                        <Badge key={order.id} variant="outline" className="font-mono text-xs">
                          {order.order_number}
                        </Badge>
                      ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No orders selected</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPMENT_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Carrier</Label>
                  <Input
                    value={formData.carrier}
                    onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                    placeholder="DHL, FedEx..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tracking #</Label>
                  <Input
                    value={formData.tracking_number}
                    onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                    placeholder="Tracking number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Factory City</Label>
                <Input
                  value={formData.factory_city}
                  onChange={(e) => setFormData({ ...formData, factory_city: e.target.value })}
                  placeholder="Factory city"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origin City</Label>
                  <Input
                    value={formData.origin_city}
                    onChange={(e) => setFormData({ ...formData, origin_city: e.target.value })}
                    placeholder="Origin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Origin Country</Label>
                  <Input
                    value={formData.origin_country}
                    onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Destination Street</Label>
                <Input
                  value={formData.destination_street}
                  onChange={(e) => setFormData({ ...formData, destination_street: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Destination City</Label>
                  <Input
                    value={formData.destination_city}
                    onChange={(e) => setFormData({ ...formData, destination_city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destination Country</Label>
                  <Input
                    value={formData.destination_country}
                    onChange={(e) => setFormData({ ...formData, destination_country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Delivery</Label>
                  <Input
                    type="date"
                    value={formData.estimated_delivery}
                    onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Actual Delivery</Label>
                  <Input
                    type="date"
                    value={formData.actual_delivery}
                    onChange={(e) => setFormData({ ...formData, actual_delivery: e.target.value })}
                  />
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                onClick={handleSubmit}
                disabled={selectedItemIds.length === 0 || updateShipment.isPending}
              >
                {updateShipment.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
