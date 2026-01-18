import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, Package, FileText, Truck, Clock, DollarSign, Ship, CreditCard, Receipt, Printer, ChevronDown, ListChecks, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrder } from '@/hooks/useOrders';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { TimeEntryForm } from '@/components/time-tracking/TimeEntryForm';
import { PaymentRecordDialog } from '@/components/finance/PaymentRecordDialog';
import { PaymentHistory } from '@/components/finance/PaymentHistory';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { ProformaInvoiceTemplate } from '@/components/documents/ProformaInvoiceTemplate';
import { CommercialInvoiceTemplate } from '@/components/documents/CommercialInvoiceTemplate';
import { PackingListTemplate } from '@/components/documents/PackingListTemplate';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useCreateDocument, generateDocumentNumber, useGeneratedDocuments } from '@/hooks/useDocuments';
import { generateDocumentFilename } from '@/lib/documentFilename';
import { DocumentHistory } from '@/components/documents/DocumentHistory';
import { TeamAssignmentCard } from '@/components/team/TeamAssignmentCard';
import { WorkflowGates } from '@/components/workflow/WorkflowGates';
import { WorkflowProgressBadge } from '@/components/workflow/WorkflowProgressBadge';
import { EntityUpdatesPanel } from '@/components/updates/EntityUpdatesPanel';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const TRADE_TERM_LABELS: Record<string, string> = {
  EXW: 'Ex Works',
  FOB: 'Free On Board',
  CIF: 'Cost, Insurance & Freight',
  DDP: 'Delivered Duty Paid',
  DAP: 'Delivered At Place',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  deposit_received: 'bg-blue-500',
  partial: 'bg-orange-500',
  fully_paid: 'bg-green-500',
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useOrder(id);
  const { data: purchaseOrders } = usePurchaseOrders({ orderId: id });
  const { data: companySettings } = useCompanySettings();
  const createDocument = useCreateDocument();

  // Document preview states
  const [showPIPreview, setShowPIPreview] = useState(false);
  const [showCIPreview, setShowCIPreview] = useState(false);
  const [showPLPreview, setShowPLPreview] = useState(false);
  const [currentDocNumber, setCurrentDocNumber] = useState('');

  const handleUpdateMilestone = async (key: string, date: Date) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ [key]: date.toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Timeline updated');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update timeline');
    }
  };

  const formatCurrency = (value: number | null | undefined, currency: string | null | undefined) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  const handleGenerateDocument = (type: 'PI' | 'CI' | 'PL') => {
    if (!companySettings) {
      toast.error('Please configure company settings first', {
        action: {
          label: 'Go to Settings',
          onClick: () => navigate('/dashboard/settings'),
        },
      });
      return;
    }

    const docNumber = generateDocumentNumber(type, order?.order_number);
    setCurrentDocNumber(docNumber);

    switch (type) {
      case 'PI':
        setShowPIPreview(true);
        break;
      case 'CI':
        setShowCIPreview(true);
        break;
      case 'PL':
        setShowPLPreview(true);
        break;
    }
  };

  const handleSaveDocument = async (type: 'PI' | 'CI' | 'PL') => {
    if (!id || !order) return;

    await createDocument.mutateAsync({
      document_type: type,
      document_number: currentDocNumber,
      order_id: id,
      generated_by: null,
      metadata: {
        order_number: order.order_number,
        customer: order.customer?.company_name,
        total_value: order.total_value,
      },
    });

    // Close the preview dialog
    switch (type) {
      case 'PI':
        setShowPIPreview(false);
        break;
      case 'CI':
        setShowCIPreview(false);
        break;
      case 'PL':
        setShowPLPreview(false);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Order not found</h2>
        <Button variant="link" onClick={() => navigate('/dashboard/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  // Convert supplier costs to order currency for accurate profit calculation
  const RMB_TO_USD_RATE = 7.2;
  const supplierTotal = purchaseOrders?.reduce((sum, po) => {
    let value = po.total_value || 0;
    const poCurrency = po.currency || 'CNY';
    const orderCurrency = order.currency || 'USD';
    
    // Convert if currencies differ
    if ((poCurrency === 'CNY' || poCurrency === 'RMB') && orderCurrency === 'USD') {
      value = value / RMB_TO_USD_RATE;
    } else if (poCurrency === 'USD' && (orderCurrency === 'CNY' || orderCurrency === 'RMB')) {
      value = value * RMB_TO_USD_RATE;
    }
    
    return sum + value;
  }, 0) || 0;
  const profitAmount = (order.total_value || 0) - supplierTotal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{order.order_number}</h1>
              <StatusBadge status={order.status} />
              {(order as any).trade_term && (
                <Badge variant="outline" className="font-medium">
                  {(order as any).trade_term}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {order.customer?.company_name} • Created {format(new Date(order.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <TimeEntryForm orderId={id} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Documents
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleGenerateDocument('PI')}>
                <FileText className="mr-2 h-4 w-4" />
                Proforma Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerateDocument('CI')}>
                <Receipt className="mr-2 h-4 w-4" />
                Commercial Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerateDocument('PL')}>
                <Package className="mr-2 h-4 w-4" />
                Packing List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => navigate(`/dashboard/orders/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Order
          </Button>
          <Button onClick={() => navigate(`/dashboard/purchase-orders/new?orderId=${id}`)}>
            <Plus className="mr-2 h-4 w-4" />
            Create PO
          </Button>
        </div>
      </div>

      {/* Team Assignment + Trade Terms and Payment Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TeamAssignmentCard 
          entityType="order" 
          entityId={id!} 
          assignedTeam={order.assigned_team} 
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Ship className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trade Terms</p>
                <p className="text-xl font-bold">
                  {(order as any).trade_term || 'EXW'}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({TRADE_TERM_LABELS[(order as any).trade_term || 'EXW']})
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer Payment</p>
                <div className="flex items-center gap-2">
                  <Badge className={`${PAYMENT_STATUS_COLORS[(order as any).customer_payment_status || 'pending']} text-white`}>
                    {((order as any).customer_payment_status || 'pending').replace('_', ' ')}
                  </Badge>
                  {((order as any).customer_deposit_amount || 0) > 0 && (
                    <span className="text-sm text-muted-foreground">
                      Deposit: {formatCurrency((order as any).customer_deposit_amount, order.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Total</p>
                <p className="text-xl font-bold">{formatCurrency(order.total_value, order.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supplier Cost</p>
                <p className="text-xl font-bold">{formatCurrency(supplierTotal, order.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${profitAmount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <DollarSign className={`h-5 w-5 ${profitAmount > 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit</p>
                <p className={`text-xl font-bold ${profitAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profitAmount, order.currency)}
                  <span className="text-sm ml-1">({order.profit_margin?.toFixed(1)}%)</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Truck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Date</p>
                <p className="text-xl font-bold">
                  {order.delivery_date 
                    ? format(new Date(order.delivery_date), 'MMM dd')
                    : 'Not set'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Products ({order.order_items?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="gap-2">
            <FileText className="h-4 w-4" />
            Purchase Orders ({purchaseOrders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <Receipt className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <Printer className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="workflow" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="updates" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Updates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>Products and specifications for this order</CardDescription>
            </CardHeader>
            <CardContent>
              {order.order_items?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added to this order yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          {/* Model # Badge - First */}
                          <div className="flex flex-col items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-sm whitespace-nowrap">
                              {item.model_number}
                            </Badge>
                            {/* Product Photo */}
                            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                              {item.product_photos?.find(p => p.is_main)?.url ? (
                                <img 
                                  src={item.product_photos.find(p => p.is_main)?.url} 
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold text-lg">{item.product_name}</h4>
                            {item.specifications && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {item.specifications}
                              </p>
                            )}
                            {item.remarks && (
                              <p className="text-sm text-muted-foreground italic mt-2">
                                Remark: {item.remarks}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × {formatCurrency(item.unit_price, order.currency)}
                          </p>
                          <p className="text-lg font-bold">
                            {formatCurrency(item.total_price, order.currency)}
                          </p>
                        </div>
                      </div>
                      {item.product_photos && item.product_photos.length > 1 && (
                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          {item.product_photos.map((photo) => (
                            <div 
                              key={photo.id} 
                              className={`w-16 h-16 rounded overflow-hidden border-2 ${photo.is_main ? 'border-primary' : 'border-transparent'}`}
                            >
                              <img src={photo.url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>Supplier orders linked to this customer order</CardDescription>
              </div>
              <Button onClick={() => navigate(`/dashboard/purchase-orders/new?orderId=${id}`)}>
                <Plus className="mr-2 h-4 w-4" />
                Create PO
              </Button>
            </CardHeader>
            <CardContent>
              {purchaseOrders?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No purchase orders created yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Terms</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Delivery</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders?.map((po) => (
                      <TableRow 
                        key={po.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/dashboard/purchase-orders/${po.id}`)}
                      >
                        <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                        <TableCell>{po.supplier?.supplier_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {(po as any).trade_term || 'EXW'}
                          </Badge>
                        </TableCell>
                        <TableCell><StatusBadge status={po.status} /></TableCell>
                        <TableCell>{formatCurrency(po.total_value, po.currency)}</TableCell>
                        <TableCell>
                          <Badge className={`${PAYMENT_STATUS_COLORS[(po as any).payment_status || 'pending']} text-white text-xs`}>
                            {((po as any).payment_status || 'pending').replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {po.delivery_date 
                            ? format(new Date(po.delivery_date), 'MMM dd')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Customer Payments</CardTitle>
                <CardDescription>Track deposits and balance payments from customer</CardDescription>
              </div>
              <div className="flex gap-2">
                <PaymentRecordDialog
                  type="customer_payment"
                  orderId={id}
                  customerId={order.customer?.id}
                  orderNumber={order.order_number}
                  defaultCurrency={order.currency || 'USD'}
                  defaultAmount={(order.total_value || 0) * 0.3}
                  purpose="deposit"
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['order', id] })}
                >
                  <Button variant="outline" size="sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Deposit
                  </Button>
                </PaymentRecordDialog>
                <PaymentRecordDialog
                  type="customer_payment"
                  orderId={id}
                  customerId={order.customer?.id}
                  orderNumber={order.order_number}
                  defaultCurrency={order.currency || 'USD'}
                  defaultAmount={(order.total_value || 0) * 0.7}
                  purpose="balance"
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['order', id] })}
                >
                  <Button variant="outline" size="sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Balance
                  </Button>
                </PaymentRecordDialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Payment Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Order Total</p>
                  <p className="text-xl font-bold">{formatCurrency(order.total_value, order.currency)}</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Deposit Received</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency((order as any).customer_deposit_amount || 0, order.currency)}
                  </p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Balance Received</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency((order as any).customer_balance_amount || 0, order.currency)}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Payment History */}
              <PaymentHistory orderId={id} type="customer_payment" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Document History</CardTitle>
              <CardDescription>Previously generated documents for this order</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentHistory orderId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrderTimeline
              milestones={{
                order_confirmed_at: order.order_confirmed_at,
                po_sent_at: order.po_sent_at,
                production_started_at: order.production_started_at,
                qc_completed_at: order.qc_completed_at,
                shipped_at: order.shipped_at,
                delivered_at: order.delivered_at,
                estimated_ship_date: order.estimated_ship_date,
                estimated_delivery_date: order.estimated_delivery_date,
                factory_lead_days: order.factory_lead_days,
                customer_lead_days: order.customer_lead_days,
              }}
              onUpdateMilestone={handleUpdateMilestone}
              editable
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Lead Times</CardTitle>
                <CardDescription>Factory and customer delivery timeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Factory Lead Time</p>
                    <p className="text-2xl font-bold">
                      {order.factory_lead_days || '—'} <span className="text-sm font-normal">days</span>
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Customer Lead Time</p>
                    <p className="text-2xl font-bold">
                      {order.customer_lead_days || '—'} <span className="text-sm font-normal">days</span>
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium mb-2">Activity Log</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order Created</span>
                      <span>{format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    {order.updated_at !== order.created_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span>{format(new Date(order.updated_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow">
          <WorkflowGates entityType="order" entityId={id!} />
        </TabsContent>

        <TabsContent value="updates">
          <EntityUpdatesPanel 
            entityType="order" 
            entityId={id!}
            title="Order Updates"
            description="Team communication and notes for this order"
          />
        </TabsContent>
      </Tabs>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{order.customer?.company_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Person</p>
              <p className="font-medium">{order.customer?.contact_person}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{order.customer?.email}</p>
            </div>
          </div>
          {order.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Order Notes</p>
                <p className="whitespace-pre-wrap">{order.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Dialogs */}
      {companySettings && order && (
        <>
          <DocumentPreviewDialog
            open={showPIPreview}
            onOpenChange={setShowPIPreview}
            title="Proforma Invoice Preview"
            onSave={() => handleSaveDocument('PI')}
            filename={generateDocumentFilename('PI', {
              orderNumber: order.order_number,
              customerName: order.customer?.company_name,
              projectTitle: order.sourcing_project?.project_title,
            })}
          >
            <ProformaInvoiceTemplate
              company={companySettings}
              customer={{
                company_name: order.customer?.company_name || '',
                contact_person: order.customer?.contact_person || '',
                email: order.customer?.email || '',
                phone: order.customer?.phone || null,
                street: order.customer?.street || null,
                city: order.customer?.city || null,
                state: order.customer?.state || null,
                country: order.customer?.country || null,
                zip_code: order.customer?.zip_code || null,
              }}
              order={{
                order_number: order.order_number,
                created_at: order.created_at,
                currency: order.currency,
                trade_term: (order as any).trade_term,
                payment_terms: (order as any).payment_terms,
                delivery_term_start: (order as any).delivery_term_start,
                delivery_term_end: (order as any).delivery_term_end,
                total_value: order.total_value,
                notes: order.notes,
              }}
              items={order.order_items?.map(item => ({
                id: item.id,
                product_name: item.product_name,
                model_number: item.model_number,
                specifications: item.specifications,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                product_number: (item as any).product_number,
                product_photos: (item as any).product_photos || [],
              })) || []}
              documentNumber={currentDocNumber}
            />
          </DocumentPreviewDialog>

          <DocumentPreviewDialog
            open={showCIPreview}
            onOpenChange={setShowCIPreview}
            title="Commercial Invoice Preview"
            onSave={() => handleSaveDocument('CI')}
            filename={generateDocumentFilename('CI', {
              orderNumber: order.order_number,
              customerName: order.customer?.company_name,
              projectTitle: order.sourcing_project?.project_title,
            })}
          >
            <CommercialInvoiceTemplate
              company={companySettings}
              customer={{
                company_name: order.customer?.company_name || '',
                contact_person: order.customer?.contact_person || '',
                email: order.customer?.email || '',
                phone: order.customer?.phone || null,
                street: order.customer?.street || null,
                city: order.customer?.city || null,
                state: order.customer?.state || null,
                country: order.customer?.country || null,
                zip_code: order.customer?.zip_code || null,
                registration_number: (order.customer as any)?.registration_number,
              }}
              order={{
                order_number: order.order_number,
                created_at: order.created_at,
                currency: order.currency,
                trade_term: (order as any).trade_term,
                payment_terms: (order as any).payment_terms,
                total_value: order.total_value,
                notes: order.notes,
              }}
              items={order.order_items?.map(item => ({
                id: item.id,
                product_name: item.product_name,
                model_number: item.model_number,
                specifications: item.specifications,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                product_number: (item as any).product_number,
                product_photos: (item as any).product_photos || [],
              })) || []}
              documentNumber={currentDocNumber}
            />
          </DocumentPreviewDialog>

          <DocumentPreviewDialog
            open={showPLPreview}
            onOpenChange={setShowPLPreview}
            title="Packing List Preview"
            onSave={() => handleSaveDocument('PL')}
            filename={generateDocumentFilename('PL', {
              orderNumber: order.order_number,
              customerName: order.customer?.company_name,
              projectTitle: order.sourcing_project?.project_title,
            })}
          >
            <PackingListTemplate
              company={companySettings}
              customer={{
                company_name: order.customer?.company_name || '',
                contact_person: order.customer?.contact_person || '',
                street: order.customer?.street || null,
                city: order.customer?.city || null,
                state: order.customer?.state || null,
                country: order.customer?.country || null,
                zip_code: order.customer?.zip_code || null,
              }}
              order={{
                order_number: order.order_number,
                trade_term: (order as any).trade_term,
              }}
              items={order.order_items?.map(item => ({
                id: item.id,
                product_name: item.product_name,
                model_number: item.model_number,
                specifications: item.specifications,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                product_number: (item as any).product_number,
                cartons: (item as any).cartons,
                gross_weight_kg: (item as any).gross_weight_kg,
                cbm: (item as any).cbm,
              })) || []}
              documentNumber={currentDocNumber}
            />
          </DocumentPreviewDialog>
        </>
      )}
    </div>
  );
}
