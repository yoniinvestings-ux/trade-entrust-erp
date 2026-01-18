import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, ExternalLink, Building2, Calendar, DollarSign, FileText, Receipt, FileSignature, CheckCircle2, Clock, Printer, ClipboardCheck, MessageSquare, Image as ImageIcon, ChevronDown, Send, Loader2, Bell, Factory, TrendingUp, AlertTriangle, Truck, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { usePurchaseOrder, useUpdatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { usePurchaseOrderItems } from '@/hooks/usePurchaseOrderItems';
import { PaymentRecordDialog } from '@/components/finance/PaymentRecordDialog';
import { PaymentHistory } from '@/components/finance/PaymentHistory';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { FactoryPOTemplate } from '@/components/documents/FactoryPOTemplate';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useCreateDocument, generateDocumentNumber, useGeneratedDocuments } from '@/hooks/useDocuments';
import { generateDocumentFilename } from '@/lib/documentFilename';
import { DocumentHistory } from '@/components/documents/DocumentHistory';
import { QCInspectionScheduleDialog } from '@/components/qc/QCInspectionScheduleDialog';
import { useQCInspections } from '@/hooks/useQCInspections';
import { TeamAssignmentCard } from '@/components/team/TeamAssignmentCard';
import { EntityUpdatesPanel } from '@/components/updates/EntityUpdatesPanel';
import { FactoryMessagesPanel } from '@/components/suppliers/FactoryMessagesPanel';
import { useSendPOToWeCom, useSupplierWeComSettings, type WeComMessageType } from '@/hooks/useWeComNotifications';
import { usePOActivityTimeline } from '@/hooks/useActivityLogs';
import { ActivityTimeline } from '@/components/orders/ActivityTimeline';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const PO_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'production', label: 'In Production' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: po, isLoading } = usePurchaseOrder(id);
  const { data: poItems } = usePurchaseOrderItems(id);
  const { data: companySettings } = useCompanySettings();
  const createDocument = useCreateDocument();
  const updatePurchaseOrder = useUpdatePurchaseOrder();

  // Activity Timeline
  const { data: timeline, isLoading: timelineLoading } = usePOActivityTimeline(id!, po?.order_id);

  const [showFactoryPO, setShowFactoryPO] = useState(false);

  // WeCom Integration
  const sendToWeCom = useSendPOToWeCom();
  const { data: wecomSettings } = useSupplierWeComSettings(po?.supplier_id);

  const handleSendToWeCom = async (messageType: WeComMessageType, metadata?: Record<string, unknown>) => {
    if (!po?.supplier_id) return;
    try {
      await sendToWeCom.mutateAsync({
        supplierId: po.supplier_id,
        poId: po.id,
        messageType,
        metadata: {
          ...metadata,
          po_number: po.po_number,
          total_value: po.total_value,
          currency: po.currency,
          delivery_date: po.delivery_date,
        }
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!po) return;
    try {
      await updatePurchaseOrder.mutateAsync({
        id: po.id,
        status: newStatus,
      });
      toast.success(`Status updated to ${PO_STATUSES.find(s => s.value === newStatus)?.label || newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const formatCurrency = (value: number | null | undefined, currency: string | null | undefined) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  const handleGenerateFactoryPO = () => {
    setShowFactoryPO(true);
  };

  const handleSaveFactoryPO = () => {
    if (!po) return;

    const documentNumber = generateDocumentNumber('PO', po.po_number);
    createDocument.mutate(
      {
        document_type: 'FACTORY_PO',
        document_number: documentNumber,
        purchase_order_id: po.id,
        order_id: po.order_id,
        metadata: {
          supplier_name: po.supplier?.supplier_name,
          total_value: po.total_value,
          generated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast.success('Factory PO document saved');
          setShowFactoryPO(false);
        },
      }
    );
  };

  const handleBuyerSign = async () => {
    if (!po) return;

    try {
      await updatePurchaseOrder.mutateAsync({
        id: po.id,
        buyer_signed: true,
        buyer_signed_at: new Date().toISOString(),
      });
      toast.success('Buyer signature recorded / 买方签字已记录');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
    } catch (error) {
      toast.error('Failed to record signature');
    }
  };

  const handleSupplierSign = async () => {
    if (!po) return;

    try {
      await updatePurchaseOrder.mutateAsync({
        id: po.id,
        supplier_signed: true,
        supplier_signed_at: new Date().toISOString(),
      });
      toast.success('Supplier signature recorded / 供应商签字已记录');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
    } catch (error) {
      toast.error('Failed to record signature');
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
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Purchase Order not found</h2>
        <Button variant="link" onClick={() => navigate('/dashboard/purchase-orders')}>
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/purchase-orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{po.po_number}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
                    <StatusBadge status={po.status} />
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {PO_STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status.value}
                      onClick={() => handleStatusChange(status.value)}
                      disabled={status.value === po.status}
                      className="gap-2"
                    >
                      <StatusBadge status={status.value} />
                      {status.value === po.status && <span className="text-muted-foreground">(current)</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-muted-foreground">
              {po.supplier?.supplier_name} • Created {format(new Date(po.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Push Factory Button - Manual reminders */}
          {wecomSettings?.wecom_webhook_url && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" disabled={sendToWeCom.isPending}>
                  {sendToWeCom.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="mr-2 h-4 w-4" />
                  )}
                  Push Factory / 催工厂
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem onClick={() => handleSendToWeCom('production_reminder')}>
                  <Factory className="mr-2 h-4 w-4 text-blue-500" />
                  <div>
                    <div>Request Confirmation / 催确认订单</div>
                    <div className="text-xs text-muted-foreground">Send reminder to confirm PO</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSendToWeCom('production_start_reminder')}>
                  <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                  <div>
                    <div>Request Production Start / 催开始生产</div>
                    <div className="text-xs text-muted-foreground">Ask factory to begin production</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSendToWeCom('production_progress_check')}>
                  <ClipboardCheck className="mr-2 h-4 w-4 text-purple-500" />
                  <div>
                    <div>Request Progress Update / 催生产进度</div>
                    <div className="text-xs text-muted-foreground">Ask for production status</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSendToWeCom('production_deadline_warning')}>
                  <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                  <div>
                    <div>Send Deadline Warning / 交期提醒</div>
                    <div className="text-xs text-muted-foreground">Remind about delivery date</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSendToWeCom('shipping_reminder')}>
                  <Truck className="mr-2 h-4 w-4 text-cyan-500" />
                  <div>
                    <div>Request Shipping / 催发货</div>
                    <div className="text-xs text-muted-foreground">Ask factory to ship goods</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSendToWeCom('request_shipping_docs')}>
                  <FileCheck className="mr-2 h-4 w-4 text-indigo-500" />
                  <div>
                    <div>Request Documents / 催发货文件</div>
                    <div className="text-xs text-muted-foreground">Request packing list, invoice</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* WeCom Send Button - Standard messages */}
          {wecomSettings?.wecom_webhook_url && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={sendToWeCom.isPending}>
                  {sendToWeCom.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  Send to WeCom
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSendToWeCom('po_created')}>
                  <Send className="mr-2 h-4 w-4" />
                  Send PO Details / 发送订单详情
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSendToWeCom('po_updated')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Send Update / 发送更新
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSendToWeCom('payment_sent')}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Payment Notification / 付款通知
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <QCInspectionScheduleDialog poId={id} orderId={po.order_id}>
            <Button variant="outline">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Schedule QC / 安排验货
            </Button>
          </QCInspectionScheduleDialog>
          <Button onClick={handleGenerateFactoryPO}>
            <Printer className="mr-2 h-4 w-4" />
            Generate Factory PO / 生成采购合同
          </Button>
          <Button variant="outline" onClick={() => navigate(`/dashboard/purchase-orders/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit PO
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <TeamAssignmentCard 
          entityType="purchase_order" 
          entityId={id!} 
          assignedTeam={(po as any).assigned_team} 
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PO Total</p>
                <p className="text-xl font-bold">{formatCurrency(po.total_value, po.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="text-xl font-bold truncate">{po.supplier?.supplier_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Date</p>
                <p className="text-xl font-bold">
                  {po.delivery_date 
                    ? format(new Date(po.delivery_date), 'MMM dd')
                    : 'Not set'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Linked Order</p>
                <Badge 
                  variant="outline" 
                  className="font-mono cursor-pointer text-base"
                  onClick={() => navigate(`/dashboard/orders/${po.order_id}`)}
                >
                  {po.order?.order_number}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Customer Order</CardTitle>
          <CardDescription>This PO is linked to the following customer order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <Badge 
                variant="outline" 
                className="font-mono cursor-pointer"
                onClick={() => navigate(`/dashboard/orders/${po.order_id}`)}
              >
                {po.order?.order_number}
                <ExternalLink className="ml-1 h-3 w-3" />
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{po.order?.customer?.company_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Total</p>
              <p className="font-medium">{formatCurrency(po.order?.total_value, po.order?.currency)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Status</p>
              <StatusBadge status={po.order?.status || 'draft'} />
            </div>
          </div>

          {po.order?.order_items && po.order.order_items.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-3">Order Items</p>
                <div className="space-y-3">
                  {po.order.order_items.map((item: any) => (
                    <div key={item.id} className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Show main photo thumbnail if available */}
                          {item.product_photos && item.product_photos.length > 0 ? (
                            <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border">
                              <img 
                                src={item.product_photos.find((p: any) => p.is_main)?.url || item.product_photos[0]?.url} 
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="font-mono">
                                {item.model_number}
                              </Badge>
                              <span className="font-medium">{item.product_name}</span>
                            </div>
                            {item.product_photos && item.product_photos.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.product_photos.length} photo(s)
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unit_price, po.order?.currency)}
                        </span>
                      </div>
                      {/* Show all photos in a row if there are multiple */}
                      {item.product_photos && item.product_photos.length > 1 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto">
                          {item.product_photos.map((photo: any) => (
                            <div 
                              key={photo.id} 
                              className={`w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border-2 ${photo.is_main ? 'border-primary' : 'border-transparent'}`}
                            >
                              <img 
                                src={photo.url} 
                                alt={photo.file_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Supplier Information */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{po.supplier?.supplier_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Person</p>
              <p className="font-medium">{po.supplier?.contact_person}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{po.supplier?.email}</p>
            </div>
          </div>
          {po.payment_terms && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Payment Terms</p>
                <p>{po.payment_terms}</p>
              </div>
            </>
          )}
          {po.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="whitespace-pre-wrap">{po.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Factory Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Factory Payments</CardTitle>
            <CardDescription>Track deposits and balance payments to supplier</CardDescription>
          </div>
          <div className="flex gap-2">
            <PaymentRecordDialog
              type="supplier_payment"
              purchaseOrderId={id}
              supplierId={po.supplier?.id}
              orderNumber={po.po_number}
              defaultCurrency={(po as any).factory_payment_currency || 'CNY'}
              defaultAmount={(po.total_value || 0) * 0.3}
              purpose="deposit"
              hasWeComWebhook={!!wecomSettings?.wecom_webhook_url}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })}
            >
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Record Deposit
              </Button>
            </PaymentRecordDialog>
            <PaymentRecordDialog
              type="supplier_payment"
              purchaseOrderId={id}
              supplierId={po.supplier?.id}
              orderNumber={po.po_number}
              defaultCurrency={(po as any).factory_payment_currency || 'CNY'}
              defaultAmount={(po.total_value || 0) * 0.7}
              purpose="balance"
              hasWeComWebhook={!!wecomSettings?.wecom_webhook_url}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })}
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
              <p className="text-sm text-muted-foreground">PO Total</p>
              <p className="text-xl font-bold">{formatCurrency(po.total_value, po.currency)}</p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Deposit Paid</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency((po as any).factory_deposit_amount || 0, (po as any).factory_payment_currency || 'CNY')}
              </p>
              {(po as any).factory_deposit_paid_at && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date((po as any).factory_deposit_paid_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Balance Paid</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency((po as any).factory_balance_amount || 0, (po as any).factory_payment_currency || 'CNY')}
              </p>
              {(po as any).factory_balance_paid_at && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date((po as any).factory_balance_paid_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Payment History */}
          <PaymentHistory purchaseOrderId={id} type="supplier_payment" />
        </CardContent>
      </Card>

      {/* Timeline - Dynamic Activity Timeline */}
      <ActivityTimeline 
        activities={timeline || []}
        title="Timeline"
        isLoading={timelineLoading}
      />

      {/* Document History */}
      <Card>
        <CardHeader>
          <CardTitle>Document History</CardTitle>
          <CardDescription>Previously generated documents for this purchase order</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentHistory purchaseOrderId={id} />
        </CardContent>
      </Card>

      {/* Signature Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Signature Status / 合同签署状态</CardTitle>
          <CardDescription>Track buyer and supplier signatures on the factory PO</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${(po as any).buyer_signed ? 'bg-green-500/10' : 'bg-muted'}`}>
                    {(po as any).buyer_signed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Buyer Signature / 买方签字</p>
                    <p className="text-sm text-muted-foreground">
                      {(po as any).buyer_signed 
                        ? `Signed on ${format(new Date((po as any).buyer_signed_at), 'MMM dd, yyyy')}`
                        : 'Pending signature'
                      }
                    </p>
                  </div>
                </div>
              </div>
              {!(po as any).buyer_signed && (
                <Button 
                  size="sm" 
                  onClick={handleBuyerSign}
                  disabled={updatePurchaseOrder.isPending}
                >
                  <FileSignature className="h-4 w-4 mr-2" />
                  Record Buyer Signature
                </Button>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${(po as any).supplier_signed ? 'bg-green-500/10' : 'bg-muted'}`}>
                    {(po as any).supplier_signed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Supplier Signature / 供应商签字</p>
                    <p className="text-sm text-muted-foreground">
                      {(po as any).supplier_signed 
                        ? `Signed on ${format(new Date((po as any).supplier_signed_at), 'MMM dd, yyyy')}`
                        : 'Pending signature'
                      }
                    </p>
                  </div>
                </div>
              </div>
              {!(po as any).supplier_signed && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleSupplierSign}
                  disabled={updatePurchaseOrder.isPending}
                >
                  <FileSignature className="h-4 w-4 mr-2" />
                  Record Supplier Signature
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Factory PO Preview Dialog */}
      <DocumentPreviewDialog
        open={showFactoryPO}
        onOpenChange={setShowFactoryPO}
        title="Factory Purchase Order / 采购合同"
        onSave={handleSaveFactoryPO}
        filename={generateDocumentFilename('FACTORY_PO', { poNumber: po.po_number })}
      >
        <FactoryPOTemplate
          company={companySettings || {
            id: '',
            company_name: 'Your Company Name',
            company_name_cn: null,
            address: null,
            address_cn: null,
            phone: null,
            email: null,
            logo_url: null,
            bank_account_name: null,
            bank_account_number: null,
            bank_name: null,
            bank_address: null,
            bank_swift_code: null,
            bank_code: null,
            bank_branch: null,
            bank_currency: null,
            created_at: null,
            updated_at: null,
          }}
          supplier={{
            supplier_name: po.supplier?.supplier_name || '',
            contact_person: po.supplier?.contact_person || '',
            phone: po.supplier?.phone || null,
            email: po.supplier?.email || '',
            wechat_id: po.supplier?.wechat_id || null,
            street: po.supplier?.street || null,
            city: po.supplier?.city || null,
            state: po.supplier?.state || null,
            country: po.supplier?.country || null,
            bank_account_name: (po.supplier as any)?.bank_account_name || null,
            bank_account_number: (po.supplier as any)?.bank_account_number || null,
            bank_name: (po.supplier as any)?.bank_name || null,
            bank_address: (po.supplier as any)?.bank_address || null,
            bank_swift_code: (po.supplier as any)?.bank_swift_code || null,
          }}
          purchaseOrder={{
            po_number: po.po_number,
            created_at: po.created_at,
            currency: po.currency,
            trade_term: po.trade_term,
            payment_terms: po.payment_terms,
            total_value: po.total_value,
            delivery_date: po.delivery_date,
            factory_deposit_amount: (po as any).factory_deposit_amount || null,
            factory_balance_amount: (po as any).factory_balance_amount || null,
            factory_payment_currency: (po as any).factory_payment_currency || null,
            packaging_requirements: (po as any).packaging_requirements || null,
            quality_inspection_terms: (po as any).quality_inspection_terms || null,
            notes: po.notes,
            product_name_cn: (po as any).product_name_cn || null,
            specifications_cn: (po as any).specifications_cn || null,
          }}
          items={(poItems || []).map((poItem) => {
            // Find matching order item to get photos
            const orderItem = po.order?.order_items?.find(
              (oi: any) => oi.id === poItem.order_item_id
            );
            return {
              id: poItem.id,
              product_name: poItem.product_name,
              model_number: poItem.model_number,
              specifications: poItem.specifications,
              quantity: poItem.quantity,
              unit_price: poItem.unit_price,
              total_price: poItem.quantity * poItem.unit_price,
              product_photos: (orderItem as any)?.product_photos || [],
            };
          })}
        />
      </DocumentPreviewDialog>

      {/* Updates Panel */}
      <EntityUpdatesPanel 
        entityType="purchase_order" 
        entityId={id!}
        title="PO Updates"
        description="Team communication and notes for this purchase order"
      />

      {/* Factory WeCom Messages Panel */}
      {wecomSettings?.wecom_webhook_url && (
        <FactoryMessagesPanel 
          poId={id!} 
          supplierName={po?.supplier?.supplier_name}
        />
      )}
    </div>
  );
}
