import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Tables']['user_roles']['Row'];
type CustomerUser = Database['public']['Tables']['customer_users']['Row'];
type SupplierUser = Database['public']['Tables']['supplier_users']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

export interface TeamMember extends Profile {
  role?: AppRole;
}

export interface CustomerPortalUser extends CustomerUser {
  profile?: Profile;
  customer?: { id: string; company_name: string };
}

export interface SupplierPortalUser extends SupplierUser {
  profile?: Profile;
  supplier?: { id: string; supplier_name: string };
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
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

export function useCustomerPortalUsers() {
  return useQuery({
    queryKey: ['customer-portal-users'],
    queryFn: async (): Promise<CustomerPortalUser[]> => {
      const { data, error } = await supabase
        .from('customer_users')
        .select(`
          *,
          customer:customers(id, company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for these users
      const userIds = data?.map(cu => cu.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return (data || []).map(cu => ({
        ...cu,
        profile: profileMap.get(cu.user_id),
        customer: cu.customer as { id: string; company_name: string },
      }));
    },
  });
}

export function useSupplierPortalUsers() {
  return useQuery({
    queryKey: ['supplier-portal-users'],
    queryFn: async (): Promise<SupplierPortalUser[]> => {
      const { data, error } = await supabase
        .from('supplier_users')
        .select(`
          *,
          supplier:suppliers(id, supplier_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for these users
      const userIds = data?.map(su => su.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return (data || []).map(su => ({
        ...su,
        profile: profileMap.get(su.user_id),
        supplier: su.supplier as { id: string; supplier_name: string },
      }));
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if role exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Role updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update role: ' + error.message);
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('User status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}

export function useTogglePortalUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      type, 
      id, 
      isActive 
    }: { 
      type: 'customer' | 'supplier'; 
      id: string; 
      isActive: boolean;
    }) => {
      const table = type === 'customer' ? 'customer_users' : 'supplier_users';
      const { error } = await supabase
        .from(table)
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ 
        queryKey: [type === 'customer' ? 'customer-portal-users' : 'supplier-portal-users'] 
      });
      toast.success('Portal user status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      role,
      entityType,
      entityId,
    }: {
      email: string;
      role: AppRole;
      entityType?: 'customer' | 'supplier';
      entityId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate a random token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase
        .from('invitation_tokens')
        .insert({
          email,
          token,
          role,
          entity_type: entityType || null,
          entity_id: entityId || null,
          invited_by: user?.id || null,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      return { token, email };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success(`Invitation created for ${data.email}. They can use "Forgot Password" to set up their account.`);
    },
    onError: (error) => {
      toast.error('Failed to create invitation: ' + error.message);
    },
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitation_tokens')
        .select('*')
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitation_tokens')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete invitation: ' + error.message);
    },
  });
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  cfo: 'CFO',
  sales: 'Sales',
  sourcing: 'Sourcing',
  marketing: 'Marketing',
  qc: 'Quality Control',
  logistics: 'Logistics',
  finance: 'Finance',
  production: 'Production',
  project_manager: 'Project Manager',
  hr: 'HR',
  merchandising: 'Merchandising',
  customer: 'Customer',
  supplier: 'Supplier',
};

export const DEPARTMENT_OPTIONS = [
  'Sales',
  'Sourcing',
  'Marketing',
  'QC',
  'Logistics',
  'Finance',
  'Production',
  'HR',
  'Management',
];
