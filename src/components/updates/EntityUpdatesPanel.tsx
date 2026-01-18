import { useState, useRef } from 'react';
import { Send, Paperclip, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { MentionInput } from './MentionInput';
import { UpdateItem } from './UpdateItem';
import { useEntityUpdates, useCreateUpdate } from '@/hooks/useEntityUpdates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EntityUpdatesPanelProps {
  entityType: 'order' | 'purchase_order' | 'sourcing' | 'customer' | 'supplier' | 'lead' | 'shipment' | 'qc_inspection' | 'quotation';
  entityId: string;
  title?: string;
  description?: string;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
}

export function EntityUpdatesPanel({ 
  entityType, 
  entityId, 
  title = 'Updates',
  description = 'Team communication and notes'
}: EntityUpdatesPanelProps) {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCustomerVisible, setIsCustomerVisible] = useState(false);
  const [isSupplierVisible, setIsSupplierVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: updates, isLoading } = useEntityUpdates(entityType, entityId);
  const createUpdate = useCreateUpdate();

  const handleSubmit = () => {
    if (!content.trim()) return;

    createUpdate.mutate({
      entity_type: entityType,
      entity_id: entityId,
      content,
      mentions,
      attachments: attachments.length > 0 ? attachments : undefined,
      is_customer_visible: isCustomerVisible,
      is_supplier_visible: isSupplierVisible,
    }, {
      onSuccess: () => {
        setContent('');
        setMentions([]);
        setAttachments([]);
        setIsCustomerVisible(false);
        setIsSupplierVisible(false);
      },
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('design-files')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('design-files')
          .getPublicUrl(data.path);

        setAttachments(prev => [...prev, {
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
        }]);
      }
      toast.success('Files uploaded');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compose New Update */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <MentionInput
            value={content}
            onChange={(value, extractedMentions) => {
              setContent(value);
              setMentions(extractedMentions);
            }}
            placeholder="Write an update... Use @ to mention team members"
          />

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-1 text-xs bg-background px-2 py-1 rounded border"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{attachment.name}</span>
                  <button 
                    onClick={() => removeAttachment(index)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Visibility Options */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="customer-visible" 
                checked={isCustomerVisible}
                onCheckedChange={(checked) => setIsCustomerVisible(checked === true)}
              />
              <Label htmlFor="customer-visible" className="text-sm flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Customer visible
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="supplier-visible" 
                checked={isSupplierVisible}
                onCheckedChange={(checked) => setIsSupplierVisible(checked === true)}
              />
              <Label htmlFor="supplier-visible" className="text-sm flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Supplier visible
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <span className="ml-1">Attach</span>
              </Button>
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={!content.trim() || createUpdate.isPending}
            >
              {createUpdate.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Post Update
            </Button>
          </div>
        </div>

        {/* Updates List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : updates && updates.length > 0 ? (
          <div className="space-y-4">
            {updates.map(update => (
              <UpdateItem 
                key={update.id} 
                update={update} 
                entityType={entityType}
                entityId={entityId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No updates yet. Be the first to post!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
