import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

export interface TeamMemberInfo extends Profile {
  role?: AppRole;
}

// Fetch all active team members for selection
export function useTeamMembersList() {
  return useQuery({
    queryKey: ['team-members-list'],
    queryFn: async (): Promise<TeamMemberInfo[]> => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));

      return (profiles || []).map(profile => ({
        ...profile,
        role: roleMap.get(profile.user_id) as AppRole | undefined,
      }));
    },
  });
}

// Resolve team member info from UUIDs
export function useTeamMembersById(userIds: string[] | null | undefined) {
  return useQuery({
    queryKey: ['team-members-by-id', userIds],
    queryFn: async (): Promise<TeamMemberInfo[]> => {
      if (!userIds || userIds.length === 0) return [];

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;

      return profiles || [];
    },
    enabled: !!userIds && userIds.length > 0,
  });
}

// Update assigned team for an entity
export function useUpdateAssignedTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      assignedTeam,
    }: {
      entityType: 'order' | 'purchase_order' | 'sourcing_project' | 'customer' | 'supplier' | 'quotation';
      entityId: string;
      assignedTeam: string[];
    }) => {
      let updateError: any = null;

      switch (entityType) {
        case 'order': {
          const result = await supabase.from('orders').update({ assigned_team: assignedTeam }).eq('id', entityId);
          updateError = result.error;
          break;
        }
        case 'purchase_order': {
          const result = await supabase.from('purchase_orders').update({ assigned_team: assignedTeam }).eq('id', entityId);
          updateError = result.error;
          break;
        }
        case 'sourcing_project': {
          const result = await supabase.from('sourcing_projects').update({ assigned_team: assignedTeam }).eq('id', entityId);
          updateError = result.error;
          break;
        }
        case 'customer': {
          const result = await supabase.from('customers').update({ assigned_team: assignedTeam }).eq('id', entityId);
          updateError = result.error;
          break;
        }
        case 'supplier': {
          const result = await supabase.from('suppliers').update({ assigned_team: assignedTeam }).eq('id', entityId);
          updateError = result.error;
          break;
        }
        case 'quotation': {
          const result = await supabase.from('quotations').update({ assigned_team: assignedTeam }).eq('id', entityId);
          updateError = result.error;
          break;
        }
        default:
          throw new Error('Invalid entity type');
      }

      if (updateError) throw updateError;

      return { entityType, entityId, assignedTeam };
    },
    onSuccess: ({ entityType, entityId }) => {
      // Invalidate relevant queries based on entity type
      const queryKeyMap: Record<string, string[]> = {
        order: ['order', 'orders'],
        purchase_order: ['purchase-order', 'purchase-orders'],
        sourcing_project: ['sourcing-project', 'sourcing-projects'],
        customer: ['customer', 'customers'],
        supplier: ['supplier', 'suppliers'],
        quotation: ['quotation', 'quotations', 'quotation-detail'],
      };

      const keys = queryKeyMap[entityType] || [];
      keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      toast.success('Team assignment updated');
    },
    onError: (error) => {
      toast.error('Failed to update team: ' + error.message);
    },
  });
}