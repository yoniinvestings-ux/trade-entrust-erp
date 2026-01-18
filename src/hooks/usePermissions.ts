import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface PermissionSetting {
  id: string;
  role: AppRole;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_assign: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const MODULES = [
  'dashboard',
  'sales',
  'leads',
  'marketing',
  'customers',
  'orders',
  'quotations',
  'purchase_orders',
  'suppliers',
  'sourcing',
  'qc',
  'after_sales',
  'shipments',
  'finance',
  'salary',
  'hr',
  'documents',
  'analytics',
  'settings',
  'admin',
  'customer_portal',
  'supplier_portal',
] as const;

export type ModuleKey = (typeof MODULES)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales Dashboard',
  leads: 'Leads',
  marketing: 'Marketing',
  customers: 'Customers',
  orders: 'Orders',
  quotations: 'Quotations',
  purchase_orders: 'Purchase Orders',
  suppliers: 'Suppliers',
  sourcing: 'Sourcing',
  qc: 'QC Inspections',
  after_sales: 'After-Sales Cases',
  shipments: 'Shipments',
  finance: 'Finance',
  salary: 'Salary Management',
  hr: 'HR',
  documents: 'Documents',
  analytics: 'Analytics',
  settings: 'Settings',
  admin: 'Admin',
  customer_portal: 'Customer Portal',
  supplier_portal: 'Supplier Portal',
};

export const TEAM_ROLES: AppRole[] = [
  'manager',
  'cfo',
  'sales',
  'sourcing',
  'marketing',
  'qc',
  'logistics',
  'finance',
  'production',
  'project_manager',
  'hr',
  'merchandising',
];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  cfo: 'CFO',
  sales: 'Sales',
  sourcing: 'Sourcing',
  marketing: 'Marketing',
  qc: 'QC',
  logistics: 'Logistics',
  finance: 'Finance',
  production: 'Production',
  project_manager: 'Project Manager',
  hr: 'HR',
  merchandising: 'Merchandising',
  customer: 'Customer',
  supplier: 'Supplier',
};

export function usePermissionSettings() {
  return useQuery({
    queryKey: ['permission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_settings')
        .select('*')
        .order('role')
        .order('module');

      if (error) throw error;
      return data as PermissionSetting[];
    },
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role,
      module,
      permission,
      value,
    }: {
      role: AppRole;
      module: string;
      permission: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_assign';
      value: boolean;
    }) => {
      // First check if permission exists
      const { data: existing } = await supabase
        .from('permission_settings')
        .select('id')
        .eq('role', role)
        .eq('module', module)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('permission_settings')
          .update({ [permission]: value, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const newPermission: Partial<PermissionSetting> = {
          role,
          module,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_assign: false,
          [permission]: value,
        };
        const { error } = await supabase
          .from('permission_settings')
          .insert(newPermission as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-settings'] });
    },
  });
}

export function useBulkUpdatePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role,
      module,
      permissions,
    }: {
      role: AppRole;
      module: string;
      permissions: {
        can_view: boolean;
        can_create: boolean;
        can_edit: boolean;
        can_delete: boolean;
        can_assign: boolean;
      };
    }) => {
      const { data: existing } = await supabase
        .from('permission_settings')
        .select('id')
        .eq('role', role)
        .eq('module', module)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('permission_settings')
          .update({ ...permissions, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('permission_settings')
          .insert({
            role,
            module,
            ...permissions,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-settings'] });
    },
  });
}

// Hook to check if current user has permission for an action
export function useHasPermission(module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'assign') {
  const { role } = useAuth();

  return useQuery({
    queryKey: ['has-permission', module, action, role],
    queryFn: async () => {
      // Super admin always has all permissions
      if (role === 'super_admin') return true;

      const { data, error } = await supabase
        .from('permission_settings')
        .select('*')
        .eq('role', role)
        .eq('module', module)
        .maybeSingle();

      if (error) throw error;
      if (!data) return false;

      const permissionKey = `can_${action}` as keyof PermissionSetting;
      return Boolean(data[permissionKey]);
    },
    enabled: !!role,
  });
}

// Synchronous permission check using cached data
export function usePermissionCheck() {
  const { role } = useAuth();
  const { data: permissions, isLoading } = usePermissionSettings();

  const hasPermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'assign'): boolean => {
    if (role === 'super_admin') return true;
    if (!permissions) return false;

    const permission = permissions.find((p) => p.role === role && p.module === module);
    if (!permission) return false;

    const permissionKey = `can_${action}` as keyof PermissionSetting;
    return Boolean(permission[permissionKey]);
  };

  return { hasPermission, isLoading };
}
