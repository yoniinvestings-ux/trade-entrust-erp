import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ArrowLeft, Package, Ship, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SHIPMENT_STATUSES = [
  { value: 'preparing', label: 'Preparing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'customs', label: 'In Customs' },
  { value: 'delivered', label: 'Delivered' },
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

export default function ShipmentForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  const preselectedCustomerId = searchParams.get('customerId');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || '');
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
    factory_city: '',
  });

  // Fetch customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers-for-shipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_person, city, country, street')
        .eq('status', 'active')
        .order('company_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders for selected customer that are ready to ship
  const { data: customerOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders-for-shipment', selectedCustomerId],
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
        .eq('customer_id', selectedCustomerId)
        .in('status', ['confirmed', 'production', 'qc', 'shipping'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OrderWithItems[];
    },
    enabled: !!selectedCustomerId,
  });

  // When customer changes, update destination address
  useEffect(() => {
    if (selectedCustomerId && customers) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setFormData(prev => ({
          ...prev,
          destination_city: customer.city || '',
          destination_country: customer.country || '',
          destination_street: customer.street || '',
        }));
      }
      // Reset selected items when customer changes
      setSelectedItemIds([]);
      setExpandedOrders([]);
    }
  }, [selectedCustomerId, customers]);

  // Auto-expand orders on load
  useEffect(() => {
    if (customerOrders && customerOrders.length > 0) {
      setExpandedOrders(customerOrders.map(o => o.id));
    }
  }, [customerOrders]);

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
      // Deselect all items from this order
      setSelectedItemIds(prev => prev.filter(id => !orderItemIds.includes(id)));
    } else {
      // Select all items from this order
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

  // Get unique order IDs from selected items
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

  const createShipment = useMutation({
    mutationFn: async () => {
      const affectedOrderIds = getAffectedOrderIds();
      const totals = calculateTotals();
      
      // Create shipment with total_cbm and factory_city
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          customer_id: selectedCustomerId,
          order_id: affectedOrderIds[0] || null, // Keep first order for backwards compat
          tracking_number: formData.tracking_number || null,
          carrier: formData.carrier || null,
          status: formData.status,
          origin_city: formData.origin_city || null,
          origin_country: formData.origin_country || null,
          destination_city: formData.destination_city || null,
          destination_country: formData.destination_country || null,
          destination_street: formData.destination_street || null,
          estimated_delivery: formData.estimated_delivery ? new Date(formData.estimated_delivery).toISOString() : null,
          factory_city: formData.factory_city || null,
          total_cbm: totals.totalCbm,
        })
        .select()
        .single();
      
      if (shipmentError) throw shipmentError;

      // Insert shipment items to track which specific items were shipped
      if (selectedItemIds.length > 0) {
        const shipmentItemRecords = selectedItemIds.map(itemId => {
          // Find the item to get quantity
          let quantity = 1;
          customerOrders?.forEach(order => {
            const item = order.order_items.find(i => i.id === itemId);
            if (item) quantity = item.quantity;
          });
          
          return {
            shipment_id: shipment.id,
            order_item_id: itemId,
            quantity_shipped: quantity,
          };
        });

        const { error: itemsError } = await supabase
          .from('shipment_items')
          .insert(shipmentItemRecords);

        if (itemsError) throw itemsError;
      }

      // Link all affected orders to the shipment
      if (affectedOrderIds.length > 0) {
        const shipmentOrderRecords = affectedOrderIds.map(orderId => ({
          shipment_id: shipment.id,
          order_id: orderId,
        }));
        
        const { error: linkError } = await supabase
          .from('shipment_orders')
          .insert(shipmentOrderRecords);
        
        if (linkError) throw linkError;

        // Update orders status to 'shipping'
        await supabase
          .from('orders')
          .update({ 
            status: 'shipping',
            shipped_at: formData.status === 'shipped' ? new Date().toISOString() : null,
          })
          .in('id', affectedOrderIds);
      }

      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Shipment created successfully');
      navigate('/dashboard/shipments');
    },
    onError: (error: any) => {
      toast.error('Failed to create shipment: ' + error.message);
    },
  });

  const handleSubmit = () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    if (selectedItemIds.length === 0) {
      toast.error('Please select at least one item');
      return;
    }
    createShipment.mutate();
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Calculate totals from selected items
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

  const { totalValue, totalItems, totalQuantity, totalCbm, totalWeight } = calculateTotals();
  const affectedOrderIds = getAffectedOrderIds();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/shipments')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title="Create New Shipment" 
          description="Select items from multiple orders to consolidate into a single shipment"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order & Item Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</span>
                Select Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name} ({customer.contact_person})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Items from Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">2</span>
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
              {!selectedCustomerId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a customer first to see their orders</p>
                </div>
              ) : ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : customerOrders?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No orders ready for shipment</p>
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
                          {/* Order Header */}
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

                          {/* Order Items */}
                          <CollapsibleContent>
                            <div className="border-t px-4 py-2 space-y-1 bg-muted/30">
                              {order.order_items.map(item => (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                                    selectedItemIds.includes(item.id)
                                      ? 'bg-primary/10 border border-primary/30'
                                      : 'hover:bg-muted'
                                  }`}
                                  onClick={() => toggleItem(item.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={selectedItemIds.includes(item.id)}
                                      onCheckedChange={() => toggleItem(item.id)}
                                    />
                                    <div>
                                      <div className="font-medium text-sm">{item.product_name}</div>
                                      {item.model_number && (
                                        <div className="text-xs text-muted-foreground">{item.model_number}</div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right text-sm">
                                    <div>Qty: {item.quantity}</div>
                                    <div className="text-muted-foreground">
                                      {formatCurrency(item.total_price, order.currency || 'USD')}
                                    </div>
                                    {(item.cbm || item.gross_weight_kg) && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {item.cbm ? `${item.cbm.toFixed(3)} m³` : ''}
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

          {/* Step 3: Shipping Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">3</span>
                Shipping Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Carrier</Label>
                  <Select 
                    value={formData.carrier} 
                    onValueChange={(v) => setFormData({ ...formData, carrier: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sea_freight">Sea Freight</SelectItem>
                      <SelectItem value="air_freight">Air Freight</SelectItem>
                      <SelectItem value="dhl">DHL</SelectItem>
                      <SelectItem value="fedex">FedEx</SelectItem>
                      <SelectItem value="ups">UPS</SelectItem>
                      <SelectItem value="maersk">Maersk</SelectItem>
                      <SelectItem value="cosco">COSCO</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
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
              </div>

              <div className="space-y-2">
                <Label>Tracking Number / BL Number</Label>
                <Input
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                  placeholder="Enter tracking or Bill of Lading number"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origin</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formData.origin_city}
                      onChange={(e) => setFormData({ ...formData, origin_city: e.target.value })}
                      placeholder="City"
                    />
                    <Input
                      value={formData.origin_country}
                      onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                      placeholder="Country"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formData.destination_city}
                      onChange={(e) => setFormData({ ...formData, destination_city: e.target.value })}
                      placeholder="City"
                    />
                    <Input
                      value={formData.destination_country}
                      onChange={(e) => setFormData({ ...formData, destination_country: e.target.value })}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Factory City (Origin)</Label>
                  <Input
                    value={formData.factory_city}
                    onChange={(e) => setFormData({ ...formData, factory_city: e.target.value })}
                    placeholder="e.g. Shenzhen, Ningbo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Delivery</Label>
                  <Input
                    type="date"
                    value={formData.estimated_delivery}
                    onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Shipment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">
                    {customers?.find(c => c.id === selectedCustomerId)?.company_name || 'Not selected'}
                  </p>
                </div>
              </div>

              {/* Selected Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{affectedOrderIds.length}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{totalItems}</p>
                  <p className="text-xs text-muted-foreground">Items</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{totalQuantity}</p>
                  <p className="text-xs text-muted-foreground">Total Units</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{totalCbm.toFixed(3)}</p>
                  <p className="text-xs text-muted-foreground">Total CBM</p>
                </div>
              </div>

              {totalWeight > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{totalWeight.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Total Weight (kg)</p>
                </div>
              )}

              {/* Total Value */}
              <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(totalValue)}
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit} 
                disabled={selectedItemIds.length === 0 || createShipment.isPending}
                className="w-full"
                size="lg"
              >
                {createShipment.isPending ? 'Creating...' : 'Create Shipment'}
              </Button>

              {selectedItemIds.length === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Select at least one item to create a shipment
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
