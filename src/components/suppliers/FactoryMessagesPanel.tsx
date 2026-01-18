import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, ArrowRight, ArrowLeft, Factory, Clock } from 'lucide-react';
import { usePOWeComMessages, type WeComMessage } from '@/hooks/useWeComNotifications';
import { format } from 'date-fns';

interface FactoryMessagesPanelProps {
  poId: string;
  supplierName?: string;
}

const ACTION_LABELS: Record<string, { label: string; labelCn: string; color: string }> = {
  CONFIRMED: { label: 'Confirmed', labelCn: '已确认', color: 'bg-green-100 text-green-700' },
  PRODUCTION_START: { label: 'Production Started', labelCn: '开始生产', color: 'bg-blue-100 text-blue-700' },
  PRODUCTION_COMPLETE: { label: 'Production Complete', labelCn: '生产完成', color: 'bg-purple-100 text-purple-700' },
  QC_PASS: { label: 'QC Passed', labelCn: '质检通过', color: 'bg-green-100 text-green-700' },
  QC_FAIL: { label: 'QC Failed', labelCn: '质检失败', color: 'bg-red-100 text-red-700' },
  SHIPPED: { label: 'Shipped', labelCn: '已发货', color: 'bg-teal-100 text-teal-700' },
  DELAY: { label: 'Delayed', labelCn: '延期', color: 'bg-orange-100 text-orange-700' },
  po_created: { label: 'PO Sent', labelCn: '发送订单', color: 'bg-blue-100 text-blue-700' },
  po_updated: { label: 'PO Updated', labelCn: '订单更新', color: 'bg-yellow-100 text-yellow-700' },
  payment_sent: { label: 'Payment Sent', labelCn: '付款通知', color: 'bg-green-100 text-green-700' },
  test: { label: 'Connection Test', labelCn: '连接测试', color: 'bg-gray-100 text-gray-700' },
  general: { label: 'Message', labelCn: '消息', color: 'bg-gray-100 text-gray-700' },
};

function MessageItem({ message }: { message: WeComMessage }) {
  const isOutbound = message.direction === 'outbound';
  const actionInfo = ACTION_LABELS[message.message_type] || ACTION_LABELS[message.parsed_action || ''] || {
    label: message.message_type,
    labelCn: message.message_type,
    color: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className={`flex gap-3 ${isOutbound ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isOutbound ? 'bg-blue-100' : 'bg-green-100'
      }`}>
        {isOutbound ? (
          <Send className="h-4 w-4 text-blue-600" />
        ) : (
          <Factory className="h-4 w-4 text-green-600" />
        )}
      </div>
      
      <div className={`flex-1 max-w-[80%] ${isOutbound ? '' : 'text-right'}`}>
        <div className={`inline-block p-3 rounded-lg ${
          isOutbound 
            ? 'bg-blue-50 dark:bg-blue-950/30 rounded-tl-none' 
            : 'bg-green-50 dark:bg-green-950/30 rounded-tr-none'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${actionInfo.color} text-xs`}>
              {isOutbound ? <ArrowRight className="h-3 w-3 mr-1" /> : <ArrowLeft className="h-3 w-3 mr-1" />}
              {actionInfo.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {message.created_at && format(new Date(message.created_at), 'HH:mm')}
            </span>
          </div>
          
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content.length > 200 
              ? message.content.substring(0, 200) + '...' 
              : message.content
            }
          </p>

          {message.parsed_data && (
            <div className="mt-2 text-xs text-muted-foreground">
              {(message.parsed_data as any).extra && (
                <span className="block">
                  Details: {(message.parsed_data as any).extra}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {message.status}
            </Badge>
            {message.processed_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Processed
              </span>
            )}
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1">
          {message.created_at && format(new Date(message.created_at), 'MMM dd, yyyy')}
        </p>
      </div>
    </div>
  );
}

export function FactoryMessagesPanel({ poId, supplierName }: FactoryMessagesPanelProps) {
  const { data: messages, isLoading } = usePOWeComMessages(poId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading messages...
        </CardContent>
      </Card>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Factory Communication</CardTitle>
          </div>
          <CardDescription>WeCom messages with {supplierName || 'supplier'}</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No messages yet</p>
          <p className="text-xs mt-1">Send this PO to WeCom to start communication</p>
        </CardContent>
      </Card>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = msg.created_at 
      ? format(new Date(msg.created_at), 'yyyy-MM-dd')
      : 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, WeComMessage[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-600" />
          <CardTitle className="text-base">Factory Communication / 工厂通讯</CardTitle>
        </div>
        <CardDescription>
          {messages.length} messages with {supplierName || 'supplier'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedMessages)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {format(new Date(date), 'MMMM dd, yyyy')}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-4">
                    {msgs.map((msg) => (
                      <MessageItem key={msg.id} message={msg} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}