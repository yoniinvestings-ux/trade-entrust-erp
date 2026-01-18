import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Shield,
  Eye,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Info,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  usePermissionSettings,
  useUpdatePermission,
  useBulkUpdatePermissions,
  MODULES,
  MODULE_LABELS,
  TEAM_ROLES,
  ROLE_LABELS,
  type ModuleKey,
} from '@/hooks/usePermissions';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type AppRole = Database['public']['Enums']['app_role'];

const PERMISSION_TYPES = [
  { key: 'can_view', label: 'View', icon: Eye, description: 'Can view records' },
  { key: 'can_create', label: 'Create', icon: Plus, description: 'Can create new records' },
  { key: 'can_edit', label: 'Edit', icon: Pencil, description: 'Can edit existing records' },
  { key: 'can_delete', label: 'Delete', icon: Trash2, description: 'Can delete records' },
  { key: 'can_assign', label: 'Assign', icon: UserPlus, description: 'Can assign team members' },
] as const;

type PermissionKey = (typeof PERMISSION_TYPES)[number]['key'];

export default function PermissionMatrix() {
  const [selectedRole, setSelectedRole] = useState<AppRole>(TEAM_ROLES[0]);
  const { data: permissions, isLoading, refetch } = usePermissionSettings();
  const updatePermission = useUpdatePermission();
  const bulkUpdate = useBulkUpdatePermissions();

  const getPermissionValue = (
    role: AppRole,
    module: string,
    permissionKey: PermissionKey
  ): boolean => {
    if (!permissions) return false;
    const perm = permissions.find((p) => p.role === role && p.module === module);
    return perm ? Boolean(perm[permissionKey]) : false;
  };

  const handleToggle = async (
    role: AppRole,
    module: string,
    permissionKey: PermissionKey,
    currentValue: boolean
  ) => {
    try {
      await updatePermission.mutateAsync({
        role,
        module,
        permission: permissionKey,
        value: !currentValue,
      });
      toast.success('Permission updated');
    } catch (error) {
      toast.error('Failed to update permission');
    }
  };

  const handleGrantAll = async (role: AppRole, module: string) => {
    try {
      await bulkUpdate.mutateAsync({
        role,
        module,
        permissions: {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_assign: true,
        },
      });
      toast.success(`Granted all permissions for ${MODULE_LABELS[module as ModuleKey]}`);
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const handleRevokeAll = async (role: AppRole, module: string) => {
    try {
      await bulkUpdate.mutateAsync({
        role,
        module,
        permissions: {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_assign: false,
        },
      });
      toast.success(`Revoked all permissions for ${MODULE_LABELS[module as ModuleKey]}`);
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const countPermissions = (role: AppRole, module: string): number => {
    if (!permissions) return 0;
    const perm = permissions.find((p) => p.role === role && p.module === module);
    if (!perm) return 0;
    return PERMISSION_TYPES.filter((pt) => Boolean(perm[pt.key])).length;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permission Matrix"
        description="Configure role-based access control for each module"
        actions={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Role Permissions
              </CardTitle>
              <CardDescription className="mt-1">
                Select a role to configure its permissions across all modules
              </CardDescription>
            </div>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      {ROLE_LABELS[role]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-[200px_repeat(5,1fr)_120px] gap-2 py-3 px-4 bg-muted/50 rounded-t-lg border-b font-medium text-sm">
                  <div>Module</div>
                  {PERMISSION_TYPES.map((perm) => (
                    <TooltipProvider key={perm.key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1.5 cursor-help">
                            <perm.icon className="h-4 w-4" />
                            <span>{perm.label}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{perm.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                  <div className="text-center">Actions</div>
                </div>

                {/* Rows */}
                <div className="divide-y">
                  {MODULES.map((module) => {
                    const permCount = countPermissions(selectedRole, module);
                    const hasAll = permCount === PERMISSION_TYPES.length;
                    const hasNone = permCount === 0;

                    return (
                      <div
                        key={module}
                        className="grid grid-cols-[200px_repeat(5,1fr)_120px] gap-2 py-3 px-4 items-center hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{MODULE_LABELS[module]}</span>
                          {hasAll && (
                            <Badge variant="secondary" className="text-xs">
                              Full Access
                            </Badge>
                          )}
                        </div>

                        {PERMISSION_TYPES.map((perm) => {
                          const value = getPermissionValue(selectedRole, module, perm.key);
                          return (
                            <div key={perm.key} className="flex justify-center">
                              <Checkbox
                                checked={value}
                                onCheckedChange={() =>
                                  handleToggle(selectedRole, module, perm.key, value)
                                }
                                disabled={updatePermission.isPending || bulkUpdate.isPending}
                                className="h-5 w-5"
                              />
                            </div>
                          );
                        })}

                        <div className="flex justify-center gap-1">
                          {!hasAll && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleGrantAll(selectedRole, module)}
                                    disabled={bulkUpdate.isPending}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Grant all permissions</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {!hasNone && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeAll(selectedRole, module)}
                                    disabled={bulkUpdate.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Revoke all permissions</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Role Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Overview</CardTitle>
          <CardDescription>
            Quick view of permission coverage across all roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[150px_repeat(13,1fr)] gap-1 text-xs">
                {/* Header with modules */}
                <div />
                {MODULES.map((module) => (
                  <TooltipProvider key={module}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center font-medium text-muted-foreground truncate px-1 cursor-help">
                          {MODULE_LABELS[module].slice(0, 3)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{MODULE_LABELS[module]}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}

                {/* Rows for each role */}
                {TEAM_ROLES.map((role) => (
                  <div key={role} className="contents">
                    <div
                      className={`font-medium py-2 px-1 rounded-l ${
                        role === selectedRole ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </div>
                    {MODULES.map((module) => {
                      const count = countPermissions(role, module);
                      const percentage = (count / PERMISSION_TYPES.length) * 100;

                      let bgColor = 'bg-muted';
                      if (percentage === 100) bgColor = 'bg-green-500';
                      else if (percentage >= 60) bgColor = 'bg-blue-500';
                      else if (percentage > 0) bgColor = 'bg-amber-500';

                      return (
                        <TooltipProvider key={module}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`h-8 ${bgColor} ${
                                  role === selectedRole ? 'ring-2 ring-primary' : ''
                                } rounded cursor-pointer transition-all hover:opacity-80`}
                                onClick={() => setSelectedRole(role)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">
                                {ROLE_LABELS[role]} - {MODULE_LABELS[module]}
                              </p>
                              <p className="text-muted-foreground">
                                {count}/{PERMISSION_TYPES.length} permissions
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Legend */}
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span>Full Access</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span>Most Permissions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-amber-500" />
              <span>Some Permissions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-muted" />
              <span>No Access</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Super Admin</strong> role has full access to
                all modules and cannot be restricted.
              </p>
              <p>
                Permissions are enforced at both the frontend (UI visibility) and backend (RLS
                policies) levels for security.
              </p>
              <p>
                Changes take effect immediately. Users may need to refresh their browser to see
                updated permissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
