import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  MessageSquare, 
  Send, 
  ChevronDown, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  Copy,
  Loader2,
  Settings
} from 'lucide-react';
import { 
  useTestWeComWebhook, 
  useUpdateWeComSettings, 
  useWeComMessages,
  type WeComSettings 
} from '@/hooks/useWeComNotifications';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface WeComSettingsPanelProps {
  supplierId: string;
  supplierName: string;
  settings: WeComSettings | null;
}

export function WeComSettingsPanel({ supplierId, supplierName, settings }: WeComSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(settings?.wecom_webhook_url || '');
  const [isEditing, setIsEditing] = useState(false);
  
  const testWebhook = useTestWeComWebhook();
  const updateSettings = useUpdateWeComSettings();
  const { data: messages } = useWeComMessages(supplierId);

  const handleSave = async () => {
    await updateSettings.mutateAsync({ supplierId, webhookUrl });
    setIsEditing(false);
  };

  const handleTest = async () => {
    await testWebhook.mutateAsync(supplierId);
  };

  const copyToken = () => {
    if (settings?.wecom_webhook_token) {
      navigator.clipboard.writeText(settings.wecom_webhook_token);
      toast.success('Token copied to clipboard');
    }
  };

  const getStatusBadge = () => {
    const status = settings?.wecom_integration_status || 'not_setup';
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><Check className="h-3 w-3 mr-1" />Active</Badge>;
      case 'testing':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Testing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-200"><X className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Settings className="h-3 w-3 mr-1" />Not Setup</Badge>;
    }
  };

  const recentMessages = messages?.slice(0, 5) || [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base">企业微信集成 / WeCom Integration</CardTitle>
                  <CardDescription>Send PO notifications directly to factory WeCom</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                    className="flex-1"
                  />
                  <Button onClick={handleSave} disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setWebhookUrl(settings?.wecom_webhook_url || '');
                    setIsEditing(false);
                  }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={settings?.wecom_webhook_url || 'Not configured'}
                    readOnly
                    className="flex-1 bg-muted"
                  />
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Webhook Token (for factory to send back) */}
            {settings?.wecom_webhook_token && (
              <div className="space-y-2">
                <Label>Webhook Token (for factory replies)</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.wecom_webhook_token}
                    readOnly
                    className="flex-1 font-mono text-xs bg-muted"
                  />
                  <Button variant="outline" size="icon" onClick={copyToken}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this token with the factory for them to send updates back to your system.
                </p>
              </div>
            )}

            {/* Test Connection */}
            {settings?.wecom_webhook_url && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Test Connection</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.wecom_last_test 
                      ? `Last tested: ${format(new Date(settings.wecom_last_test), 'MMM dd, HH:mm')}`
                      : 'Not tested yet'
                    }
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleTest}
                  disabled={testWebhook.isPending}
                >
                  {testWebhook.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Test
                </Button>
              </div>
            )}

            {/* Error Display */}
            {settings?.wecom_last_error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Last Error</p>
                  <p className="text-xs text-red-600 dark:text-red-500">{settings.wecom_last_error}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Error count: {settings.wecom_error_count || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Recent Messages */}
            {recentMessages.length > 0 && (
              <div className="space-y-2">
                <Label>Recent Messages</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`p-2 rounded-lg text-xs ${
                        msg.direction === 'outbound' 
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-500' 
                          : 'bg-green-50 dark:bg-green-950/20 border-l-2 border-green-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {msg.direction === 'outbound' ? '→ Sent' : '← Received'}
                        </span>
                        <span className="text-muted-foreground">
                          {msg.created_at && format(new Date(msg.created_at), 'MMM dd HH:mm')}
                        </span>
                      </div>
                      <p className="truncate">{msg.content.substring(0, 100)}...</p>
                      {msg.parsed_action && (
                        <Badge variant="outline" className="mt-1">{msg.parsed_action}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}