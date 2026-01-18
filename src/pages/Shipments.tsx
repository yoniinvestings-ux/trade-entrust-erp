import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, MoreHorizontal, Truck, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SHIPMENT_STATUSES = [
  { value: 'preparing', label: 'Preparing', color: 'bg-gray-500' },
  { value: 'shipped', label: 'Shipped', color: 'bg-blue-500' },
  { value: 'in_transit', label: 'In Transit', color: 'bg-yellow-500' },
  { value: 'customs', label: 'In Customs', color: 'bg-orange-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

interface ShipmentFormData {
  order_id: string;
  customer_id: string;
  tracking_number: string;
  carrier: string;
  status: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  estimated_delivery: string;
}

export default function Shipments() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<any>(null);
  const [formData, setFormData] = useState<ShipmentFormData>({
    order_id: '',
    customer_id: '',
    tracking_number: '',
    carrier: '',
    status: 'preparing',
    origin_city: '',
    origin_country: '',
    destination_city: '',
    destination_country: '',
    estimated_delivery: '',
  });
  
  const queryClient = useQueryClient();

  // Fetch shipments with related data including linked orders
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select(`
          *,
          customer:customers(id, company_name, contact_person)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`tracking_number.ilike.%${search}%,carrier.ilike.%${search}%`);
      }

      const { data: shipmentsData, error } = await query;
      if (error) throw error;

      // Fetch linked orders for each shipment
      if (shipmentsData && shipmentsData.length > 0) {
        const shipmentIds = shipmentsData.map(s => s.id);
        const { data: shipmentOrders } = await supabase
          .from('shipment_orders')
          .select('shipment_id, order:orders(id, order_number, total_value, currency, sourcing_project:sourcing_projects(id, project_title))')
          .in('shipment_id', shipmentIds);

        return shipmentsData.map(shipment => ({
          ...shipment,
          linked_orders: shipmentOrders?.filter(so => so.shipment_id === shipment.id).map(so => so.order) || [],
        }));
      }

      return shipmentsData || [];
    },
  });

  // Fetch orders for linking
  const { data: orders } = useQuery({
    queryKey: ['orders-for-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_id, customer:customers(id, company_name)')
        .in('status', ['production', 'qc', 'shipping'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createShipment = useMutation({
    mutationFn: async (data: ShipmentFormData) => {
      const { error } = await supabase.from('shipments').insert({
        ...data,
        estimated_delivery: data.estimated_delivery || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment created');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to create shipment: ' + error.message);
    },
  });

  const updateShipment = useMutation({
    mutationFn: async ({ id, ...data }: ShipmentFormData & { id: string }) => {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };
      if (data.status === 'delivered') {
        updateData.actual_delivery = new Date().toISOString();
      }
      const { error } = await supabase
        .from('shipments')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment updated');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to update shipment: ' + error.message);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingShipment(null);
    setFormData({
      order_id: '',
      customer_id: '',
      tracking_number: '',
      carrier: '',
      status: 'preparing',
      origin_city: '',
      origin_country: '',
      destination_city: '',
      destination_country: '',
      estimated_delivery: '',
    });
  };

  const handleEditShipment = (shipment: any) => {
    setEditingShipment(shipment);
    setFormData({
      order_id: shipment.order_id,
      customer_id: shipment.customer_id,
      tracking_number: shipment.tracking_number || '',
      carrier: shipment.carrier || '',
      status: shipment.status,
      origin_city: shipment.origin_city || '',
      origin_country: shipment.origin_country || '',
      destination_city: shipment.destination_city || '',
      destination_country: shipment.destination_country || '',
      estimated_delivery: shipment.estimated_delivery ? format(new Date(shipment.estimated_delivery), 'yyyy-MM-dd') : '',
    });
    setIsDialogOpen(true);
  };

  const handleOrderChange = (orderId: string) => {
    const order = orders?.find(o => o.id === orderId);
    setFormData({ 
      ...formData, 
      order_id: orderId,
      customer_id: order?.customer_id || '',
    });
  };

  const handleSubmit = () => {
    if (editingShipment) {
      updateShipment.mutate({ id: editingShipment.id, ...formData });
    } else {
      createShipment.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = SHIPMENT_STATUSES.find(s => s.value === status);
    return (
      <Badge variant="secondary" className={`${statusConfig?.color} text-white`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Shipments" 
        description="Track shipments and deliveries"
      >
        <Button onClick={() => navigate('/dashboard/shipments/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tracking number or carrier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {SHIPMENT_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : shipments?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shipments found. Create your first shipment to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>CBM</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments?.map((shipment: any) => (
                    <TableRow key={shipment.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          {shipment.linked_orders && shipment.linked_orders.length > 0 ? (
                            shipment.linked_orders.map((order: any) => (
                              <div key={order?.id} className="font-mono text-sm">{order?.order_number}</div>
                            ))
                          ) : (
                            <div className="text-muted-foreground">-</div>
                          )}
                          {shipment.linked_orders && shipment.linked_orders.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {shipment.linked_orders.length} orders
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {shipment.linked_orders?.[0]?.sourcing_project?.project_title || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{shipment.customer?.company_name}</div>
                          <div className="text-xs text-muted-foreground">{shipment.customer?.contact_person}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono text-sm">{shipment.tracking_number || '-'}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {(shipment.carrier || '-').replace('_', ' ')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          <span>{shipment.factory_city || shipment.origin_city || '?'}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{shipment.destination_city || '?'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {shipment.total_cbm ? `${Number(shipment.total_cbm).toFixed(3)} m³` : '-'}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {shipment.estimated_delivery 
                          ? format(new Date(shipment.estimated_delivery), 'MMM d, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/shipments/${shipment.id}/edit`)}>
                              Edit Shipment
                            </DropdownMenuItem>
                            <DropdownMenuItem>Track Shipment</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingShipment ? 'Edit Shipment' : 'Create Shipment'}</DialogTitle>
            <DialogDescription>
              {editingShipment ? 'Update shipment details' : 'Create a new shipment for an order'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_id">Order *</Label>
                <Select 
                  value={formData.order_id} 
                  onValueChange={handleOrderChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders?.map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.customer?.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPMENT_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Input
                  id="carrier"
                  value={formData.carrier}
                  onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                  placeholder="DHL, FedEx, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking_number">Tracking Number</Label>
                <Input
                  id="tracking_number"
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                  placeholder="123456789"
                />
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="estimated_delivery">Estimated Delivery</Label>
              <Input
                id="estimated_delivery"
                type="date"
                value={formData.estimated_delivery}
                onChange={(e) => setFormData({ ...formData, estimated_delivery: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.order_id || !formData.customer_id}
            >
              {editingShipment ? 'Update Shipment' : 'Create Shipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
