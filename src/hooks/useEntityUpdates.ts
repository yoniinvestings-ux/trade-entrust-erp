import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import type { Json } from '@/integrations/supabase/types';

export interface EntityUpdate {
  id: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  content: string;
  attachments: Json | null;
  mentions: string[] | null;
  parent_id: string | null;
  is_pinned: boolean | null;
  reactions: Json | null;
  is_customer_visible: boolean | null;
  is_supplier_visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
  replies?: EntityUpdate[];
}

export interface CreateUpdateInput {
  entity_type: string;
  entity_id: string;
  content: string;
  attachments?: { name: string; url: string; type: string }[];
  mentions?: string[];
  parent_id?: string | null;
  is_customer_visible?: boolean;
  is_supplier_visible?: boolean;
}

// Fetch updates for an entity
export function useEntityUpdates(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['entity-updates', entityType, entityId],
    queryFn: async (): Promise<EntityUpdate[]> => {
      // Fetch top-level updates (no parent)
      const { data: updates, error } = await supabase
        .from('entity_updates')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('parent_id', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!updates || updates.length === 0) return [];

      // Fetch author profiles
      const authorIds = [...new Set(updates.map(u => u.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      // Fetch replies for all updates
      const updateIds = updates.map(u => u.id);
      const { data: replies } = await supabase
        .from('entity_updates')
        .select('*')
        .in('parent_id', updateIds)
        .order('created_at', { ascending: true });

      // Fetch profiles for reply authors too
      const replyAuthorIds = [...new Set(replies?.map(r => r.author_id) || [])];
      if (replyAuthorIds.length > 0) {
        const { data: replyProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', replyAuthorIds);
        replyProfiles?.forEach(p => profileMap.set(p.user_id, p));
      }

      return updates.map(update => ({
        ...update,
        author: profileMap.get(update.author_id),
        replies: (replies?.filter(r => r.parent_id === update.id) || []).map(reply => ({
          ...reply,
          author: profileMap.get(reply.author_id),
        })),
      }));
    },
    enabled: !!entityType && !!entityId,
  });
}

// Create a new update
export function useCreateUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateUpdateInput) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('entity_updates')
        .insert({
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          author_id: user.id,
          content: input.content,
          attachments: input.attachments as Json,
          mentions: input.mentions || [],
          parent_id: input.parent_id || null,
          is_customer_visible: input.is_customer_visible ?? false,
          is_supplier_visible: input.is_supplier_visible ?? false,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notifications for mentioned users
      if (input.mentions && input.mentions.length > 0) {
        const notifications = input.mentions.map(mentionedUserId => ({
          user_id: mentionedUserId,
          type: 'mention',
          title: 'You were mentioned',
          message: `You were mentioned in an update`,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          action_url: `/${input.entity_type === 'order' ? 'dashboard/orders' : input.entity_type === 'purchase_order' ? 'dashboard/purchase-orders' : 'dashboard/sourcing'}/${input.entity_id}`,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['entity-updates', variables.entity_type, variables.entity_id],
      });
      toast.success(variables.parent_id ? 'Reply added' : 'Update posted');
    },
    onError: (error) => {
      toast.error('Failed to post update: ' + error.message);
    },
  });
}

// Toggle pin status
export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updateId, isPinned, entityType, entityId }: {
      updateId: string;
      isPinned: boolean;
      entityType: string;
      entityId: string;
    }) => {
      const { error } = await supabase
        .from('entity_updates')
        .update({ is_pinned: !isPinned })
        .eq('id', updateId);

      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['entity-updates', result.entityType, result.entityId],
      });
      toast.success('Pin status updated');
    },
    onError: (error) => {
      toast.error('Failed to update pin: ' + error.message);
    },
  });
}

// Delete an update
export function useDeleteUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updateId, entityType, entityId }: {
      updateId: string;
      entityType: string;
      entityId: string;
    }) => {
      // Delete replies first
      await supabase.from('entity_updates').delete().eq('parent_id', updateId);
      
      const { error } = await supabase
        .from('entity_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['entity-updates', result.entityType, result.entityId],
      });
      toast.success('Update deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });
}
