import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  ClipboardCheck, 
  Package, 
  MessageSquare, 
  Factory, 
  Truck, 
  CheckCircle2,
  FileText,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  type: 'log' | 'payment' | 'qc' | 'update' | 'wecom' | 'po';
  timestamp: string;
  data: Record<string, unknown>;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  title?: string;
  maxHeight?: string;
  isLoading?: boolean;
}

function getActivityIcon(activity: ActivityItem) {
  switch (activity.type) {
    case 'payment':
      return <DollarSign className="h-4 w-4" />;
    case 'qc':
      return <ClipboardCheck className="h-4 w-4" />;
    case 'wecom':
      return <MessageSquare className="h-4 w-4" />;
    case 'po':
      const action = activity.data.action as string;
      if (action === 'shipped') return <Truck className="h-4 w-4" />;
      if (action === 'production_started' || action === 'production_completed') return <Factory className="h-4 w-4" />;
      if (action === 'confirmed' || action === 'qc_completed') return <CheckCircle2 className="h-4 w-4" />;
      return <Package className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getActivityColor(activity: ActivityItem) {
  switch (activity.type) {
    case 'payment':
      return 'bg-green-500 text-white';
    case 'qc':
      const status = activity.data.status as string;
      if (status === 'failed') return 'bg-destructive text-destructive-foreground';
      if (status === 'passed') return 'bg-green-500 text-white';
      return 'bg-yellow-500 text-white';
    case 'wecom':
      const wecomStatus = activity.data.status as string;
      return wecomStatus === 'sent' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground';
    case 'po':
      return 'bg-primary text-primary-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getActivityTitle(activity: ActivityItem): string {
  switch (activity.type) {
    case 'payment':
      const purpose = activity.data.purpose as string;
      const source = activity.data.source as string;
      const purposeMap: Record<string, string> = {
        'factory_deposit': 'Supplier Deposit Paid',
        'factory_balance': 'Supplier Balance Paid',
        'customer_deposit': 'Customer Deposit Received',
        'customer_balance': 'Customer Balance Received',
      };
      return purposeMap[purpose] || (source === 'supplier' ? 'Supplier Payment' : 'Customer Payment');
    
    case 'qc':
      const inspectionType = activity.data.inspection_type as string || 'QC';
      const qcStatus = activity.data.status as string;
      return `${inspectionType.toUpperCase()} Inspection - ${qcStatus === 'passed' ? 'Passed' : qcStatus === 'failed' ? 'Failed' : 'Pending'}`;
    
    case 'wecom':
      const msgType = activity.data.message_type as string;
      const msgTypeMap: Record<string, string> = {
        'po_created': 'PO Sent to Factory',
        'po_updated': 'PO Update Notification',
        'payment_sent': 'Payment Notification Sent',
        'test': 'WeCom Test Message',
      };
      return msgTypeMap[msgType] || 'Factory Message';
    
    case 'po':
      const action = activity.data.action as string;
      const poNumber = activity.data.po_number as string;
      const actionMap: Record<string, string> = {
        'created': `PO ${poNumber} Created`,
        'confirmed': `PO ${poNumber} Confirmed by Factory`,
        'production_started': `Production Started (${poNumber})`,
        'production_completed': `Production Completed (${poNumber})`,
        'qc_completed': `QC Completed (${poNumber})`,
        'shipped': `Shipped (${poNumber})`,
      };
      return actionMap[action] || `PO ${poNumber} Updated`;
    
    case 'log':
      return activity.data.action as string || 'Activity';
    
    default:
      return 'Activity';
  }
}

function getActivityDescription(activity: ActivityItem): string | null {
  switch (activity.type) {
    case 'payment':
      // Use allocated_amount if this is an allocation, otherwise use amount
      const isAllocation = activity.data.is_allocation as boolean;
      const amount = isAllocation 
        ? (activity.data.allocated_amount as number) 
        : (activity.data.amount as number);
      const currency = isAllocation 
        ? (activity.data.allocation_currency as string || activity.data.currency as string || 'USD')
        : (activity.data.currency as string || 'USD');
      const method = activity.data.payment_method as string;
      const methodMap: Record<string, string> = {
        'bank_transfer': 'Bank Transfer',
        'wire': 'Wire Transfer',
        'cash': 'Cash',
        'wechat_pay': 'WeChat Pay',
        'alipay': 'Alipay',
      };
      return `${currency} ${amount?.toLocaleString()} via ${methodMap[method] || method}`;
    
    case 'qc':
      const conclusion = activity.data.conclusion as string;
      return conclusion || null;
    
    case 'wecom':
      const wecomStatus = activity.data.status as string;
      return wecomStatus === 'sent' ? 'Message delivered successfully' : wecomStatus === 'failed' ? 'Failed to deliver' : 'Pending';
    
    case 'po':
      const supplier = activity.data.supplier as { supplier_name?: string };
      return supplier?.supplier_name || null;
    
    default:
      return null;
  }
}

export function ActivityTimeline({ activities, title = 'Activity Timeline', maxHeight = '400px', isLoading = false }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No activity recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="secondary">{activities.length} events</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea style={{ maxHeight }} className="pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const title = getActivityTitle(activity);
                const description = getActivityDescription(activity);
                const formattedDate = format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm');
                
                return (
                  <div key={index} className="relative flex items-start gap-4 pl-2">
                    {/* Icon */}
                    <div className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background",
                      getActivityColor(activity)
                    )}>
                      {getActivityIcon(activity)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-medium text-sm">{title}</p>
                      {description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{formattedDate}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
