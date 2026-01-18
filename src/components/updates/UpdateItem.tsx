import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Pin, MessageCircle, Trash2, MoreHorizontal, 
  Paperclip, Eye, EyeOff, Reply
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { renderContentWithMentions, MentionInput } from './MentionInput';
import { useCreateUpdate, useTogglePin, useDeleteUpdate, type EntityUpdate } from '@/hooks/useEntityUpdates';
import { cn } from '@/lib/utils';

interface UpdateItemProps {
  update: EntityUpdate;
  entityType: string;
  entityId: string;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
}

export function UpdateItem({ update, entityType, entityId }: UpdateItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyMentions, setReplyMentions] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const createUpdate = useCreateUpdate();
  const togglePin = useTogglePin();
  const deleteUpdate = useDeleteUpdate();

  const handleReply = () => {
    if (!replyContent.trim()) return;
    
    createUpdate.mutate({
      entity_type: entityType,
      entity_id: entityId,
      content: replyContent,
      mentions: replyMentions,
      parent_id: update.id,
    }, {
      onSuccess: () => {
        setReplyContent('');
        setReplyMentions([]);
        setShowReplyInput(false);
      },
    });
  };

  const handleTogglePin = () => {
    togglePin.mutate({
      updateId: update.id,
      isPinned: update.is_pinned || false,
      entityType,
      entityId,
    });
  };

  const handleDelete = () => {
    deleteUpdate.mutate({
      updateId: update.id,
      entityType,
      entityId,
    });
    setShowDeleteDialog(false);
  };

  const attachments = (Array.isArray(update.attachments) ? update.attachments : []) as unknown as Attachment[];

  return (
    <div className={cn(
      'border rounded-lg p-4 space-y-3',
      update.is_pinned && 'border-primary/50 bg-primary/5'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={update.author?.avatar_url || undefined} />
            <AvatarFallback>
              {update.author?.display_name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {update.author?.display_name || 'Unknown'}
              </span>
              {update.is_pinned && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {update.created_at && formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Visibility indicators */}
          <div className="flex items-center gap-1 mr-2">
            {update.is_customer_visible && (
              <Badge variant="outline" className="text-xs gap-1">
                <Eye className="h-3 w-3" />
                Customer
              </Badge>
            )}
            {update.is_supplier_visible && (
              <Badge variant="outline" className="text-xs gap-1">
                <Eye className="h-3 w-3" />
                Supplier
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleTogglePin}>
                <Pin className="h-4 w-4 mr-2" />
                {update.is_pinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="text-sm whitespace-pre-wrap">
        {renderContentWithMentions(update.content)}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <a
              key={index}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
            >
              <Paperclip className="h-3 w-3" />
              {attachment.name}
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs"
          onClick={() => setShowReplyInput(!showReplyInput)}
        >
          <Reply className="h-3 w-3 mr-1" />
          Reply
          {update.replies && update.replies.length > 0 && (
            <span className="ml-1">({update.replies.length})</span>
          )}
        </Button>
      </div>

      {/* Reply Input */}
      {showReplyInput && (
        <div className="space-y-2 pl-4 border-l-2 border-muted">
          <MentionInput
            value={replyContent}
            onChange={(value, mentions) => {
              setReplyContent(value);
              setReplyMentions(mentions);
            }}
            placeholder="Write a reply..."
            minRows={2}
          />
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleReply}
              disabled={!replyContent.trim() || createUpdate.isPending}
            >
              Reply
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                setShowReplyInput(false);
                setReplyContent('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {update.replies && update.replies.length > 0 && (
        <div className="space-y-3 pl-4 border-l-2 border-muted">
          {update.replies.map(reply => (
            <div key={reply.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={reply.author?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {reply.author?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">
                  {reply.author?.display_name || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {reply.created_at && formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="text-sm pl-8">
                {renderContentWithMentions(reply.content)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this update? This will also delete all replies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
