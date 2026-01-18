import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import {
  Users,
  UserPlus,
  Building2,
  Factory,
  Search,
  MoreHorizontal,
  Mail,
  Trash2,
  Clock,
  Filter,
  Shield,
} from 'lucide-react';
import {
  useTeamMembers,
  useCustomerPortalUsers,
  useSupplierPortalUsers,
  useUpdateUserRole,
  useToggleUserActive,
  useTogglePortalUserActive,
  useInvitations,
  useDeleteInvitation,
  ROLE_LABELS,
  DEPARTMENT_OPTIONS,
} from '@/hooks/useUsers';
import type { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type AppRole = Database['public']['Enums']['app_role'];

const TEAM_ROLES: AppRole[] = [
  'super_admin',
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

export default function UserManagement() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteType, setInviteType] = useState<'team' | 'customer' | 'supplier'>('team');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const { data: teamMembers, isLoading: loadingTeam } = useTeamMembers();
  const { data: customerUsers, isLoading: loadingCustomers } = useCustomerPortalUsers();
  const { data: supplierUsers, isLoading: loadingSuppliers } = useSupplierPortalUsers();
  const { data: invitations, isLoading: loadingInvitations } = useInvitations();

  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();
  const togglePortalActive = useTogglePortalUserActive();
  const deleteInvitation = useDeleteInvitation();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredTeamMembers = teamMembers?.filter((member) => {
    const matchesSearch =
      member.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesDept = departmentFilter === 'all' || member.department === departmentFilter;
    return matchesSearch && matchesRole && matchesDept;
  });

  const handleInvite = (type: 'team' | 'customer' | 'supplier') => {
    setInviteType(type);
    setInviteOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage team members, customer portal users, and supplier portal users"
        actions={
          <Button onClick={() => handleInvite('team')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        }
      />

      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team Members
            {teamMembers && <Badge variant="secondary" className="ml-1">{teamMembers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Building2 className="h-4 w-4" />
            Customer Portal
            {customerUsers && <Badge variant="secondary" className="ml-1">{customerUsers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Factory className="h-4 w-4" />
            Supplier Portal
            {supplierUsers && <Badge variant="secondary" className="ml-1">{supplierUsers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            Pending Invitations
            {invitations && invitations.length > 0 && (
              <Badge variant="secondary" className="ml-1">{invitations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Team Members Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {TEAM_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTeam ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : filteredTeamMembers?.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No team members found"
                  description="Invite your first team member to get started"
                  action={{
                    label: 'Invite Team Member',
                    onClick: () => handleInvite('team'),
                  }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeamMembers?.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(member.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.display_name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.role || ''}
                            onValueChange={(value) =>
                              updateRole.mutate({ userId: member.user_id, role: value as AppRole })
                            }
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Assign role">
                                {member.role ? (
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3" />
                                    {ROLE_LABELS[member.role]}
                                  </div>
                                ) : (
                                  'No role'
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {TEAM_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.department || 'Unassigned'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={member.is_active}
                              onCheckedChange={(checked) =>
                                toggleActive.mutate({ userId: member.user_id, isActive: checked })
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {member.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Portal Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Customer Portal Users</CardTitle>
                <Button onClick={() => handleInvite('customer')}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Customer User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCustomers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : customerUsers?.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No customer portal users"
                  description="Invite customers to access their dedicated portal"
                  action={{
                    label: 'Invite Customer',
                    onClick: () => handleInvite('customer'),
                  }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerUsers?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                {user.profile ? getInitials(user.profile.display_name) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.profile?.display_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.profile?.email || '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Building2 className="mr-1 h-3 w-3" />
                            {user.customer?.company_name || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.access_level || 'Viewer'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.is_active ?? true}
                              onCheckedChange={(checked) =>
                                togglePortalActive.mutate({
                                  type: 'customer',
                                  id: user.id,
                                  isActive: checked,
                                })
                              }
                            />
                            <span className="text-sm">
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.invited_at
                            ? format(new Date(user.invited_at), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplier Portal Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Supplier Portal Users</CardTitle>
                <Button onClick={() => handleInvite('supplier')}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Supplier User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSuppliers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : supplierUsers?.length === 0 ? (
                <EmptyState
                  icon={Factory}
                  title="No supplier portal users"
                  description="Invite suppliers to access their dedicated portal"
                  action={{
                    label: 'Invite Supplier',
                    onClick: () => handleInvite('supplier'),
                  }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierUsers?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-orange-100 text-orange-700">
                                {user.profile ? getInitials(user.profile.display_name) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.profile?.display_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.profile?.email || '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Factory className="mr-1 h-3 w-3" />
                            {user.supplier?.supplier_name || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.access_level || 'Viewer'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.is_active ?? true}
                              onCheckedChange={(checked) =>
                                togglePortalActive.mutate({
                                  type: 'supplier',
                                  id: user.id,
                                  isActive: checked,
                                })
                              }
                            />
                            <span className="text-sm">
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.invited_at
                            ? format(new Date(user.invited_at), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInvitations ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : invitations?.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="No pending invitations"
                  description="All invitations have been accepted or expired"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations?.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {invitation.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <Shield className="mr-1 h-3 w-3" />
                            {ROLE_LABELS[invitation.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {invitation.entity_type === 'customer'
                              ? 'Customer Portal'
                              : invitation.entity_type === 'supplier'
                              ? 'Supplier Portal'
                              : 'Team Member'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteInvitation.mutate(invitation.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        type={inviteType}
      />
    </div>
  );
}
