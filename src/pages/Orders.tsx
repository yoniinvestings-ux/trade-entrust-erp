import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { StatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusPipeline } from '@/components/ui/status-pipeline';
import { AdvancedFilters } from '@/components/ui/advanced-filters';
import { useOrders, useDeleteOrder } from '@/hooks/useOrders';
import { TeamAssignmentCard } from '@/components/team/TeamAssignmentCard';
import { WorkflowProgressBadge } from '@/components/workflow/WorkflowProgressBadge';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

const ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sample_before_production', label: 'Sample' },
  { value: 'production', label: 'Production' },
  { value: 'qc', label: 'QC' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Orders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [teamMember, setTeamMember] = useState('');

  // Fetch all orders for pipeline counts, then filter client-side
  const { data: allOrders, isLoading } = useOrders({});
  const deleteOrder = useDeleteOrder();
  const queryClient = useQueryClient();

  // Calculate status counts from all orders
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ORDER_STATUSES.forEach((s) => (counts[s.value] = 0));
    allOrders?.forEach((order) => {
      if (counts[order.status] !== undefined) {
        counts[order.status]++;
      }
    });
    return counts;
  }, [allOrders]);

  // Filter orders based on all criteria
  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];

    return allOrders.filter((order) => {
      // Status filter
      if (status !== 'all' && order.status !== status) return false;

      // Date range filter
      if (dateRange.from) {
        const orderDate = new Date(order.created_at);
        if (orderDate < startOfDay(dateRange.from)) return false;
      }
      if (dateRange.to) {
        const orderDate = new Date(order.created_at);
        if (orderDate > endOfDay(dateRange.to)) return false;
      }

      // Team member filter
      if (teamMember && !order.assigned_team?.includes(teamMember)) return false;

      // Deep search across multiple fields
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesOrderNumber = order.order_number?.toLowerCase().includes(searchLower);
        const matchesCustomer = order.customer?.company_name?.toLowerCase().includes(searchLower);
        const matchesContact = order.customer?.contact_person?.toLowerCase().includes(searchLower);
        const matchesItems = order.order_items?.some(
          (item: any) =>
            item.product_name?.toLowerCase().includes(searchLower) ||
            item.model_number?.toLowerCase().includes(searchLower) ||
            item.product_number?.toLowerCase().includes(searchLower)
        );
        if (!matchesOrderNumber && !matchesCustomer && !matchesContact && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [allOrders, status, search, dateRange, teamMember]);

  const hasActiveFilters = dateRange.from || dateRange.to || teamMember;

  const handleDelete = async () => {
    if (deleteId) {
      await deleteOrder.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase.from('order_items').delete().in('order_id', ids);
      await supabase.from('purchase_orders').delete().in('order_id', ids);
      await supabase.from('financial_records').delete().in('order_id', ids);
      await supabase.from('generated_documents').delete().in('order_id', ids);
      await supabase.from('qc_inspections').delete().in('order_id', ids);
      const { error } = await supabase.from('orders').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`${selectedIds.size} orders deleted`);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error('Failed to delete orders: ' + error.message);
    },
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (filteredOrders && selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else if (filteredOrders) {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  const clearFilters = () => {
    setDateRange({});
    setTeamMember('');
    setSearch('');
    setStatus('all');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Manage customer orders and track their status">
        <Button onClick={() => navigate('/dashboard/orders/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </PageHeader>

      {/* Status Pipeline */}
      <StatusPipeline
        statuses={ORDER_STATUSES}
        counts={statusCounts}
        activeStatus={status}
        onStatusChange={setStatus}
        allLabel="All Orders"
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg font-medium">
                  {status === 'all' ? 'All Orders' : ORDER_STATUSES.find((s) => s.value === status)?.label}
                  <span className="ml-2 text-muted-foreground font-normal">({filteredOrders.length})</span>
                </CardTitle>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                    <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteDialog(true)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Selected
                    </Button>
                  </div>
                )}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, items, customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Advanced Filters */}
            <AdvancedFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              teamMember={teamMember}
              onTeamMemberChange={setTeamMember}
              hasActiveFilters={!!hasActiveFilters}
              onClearFilters={clearFilters}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No orders found. Create your first order to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                        />
                      </TableCell>
                      <TableCell
                        className="font-mono font-medium"
                        onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                      >
                        {order.order_number}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/dashboard/orders/${order.id}`)}>
                        <span className="text-sm text-muted-foreground">
                          {order.sourcing_project?.project_title || '-'}
                        </span>
                      </TableCell>
                      <TableCell onClick={() => navigate(`/dashboard/orders/${order.id}`)}>
                        <div>
                          <p className="font-medium">{order.customer?.company_name || '-'}</p>
                          <p className="text-sm text-muted-foreground">{order.customer?.contact_person}</p>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TeamAssignmentCard
                          entityType="order"
                          entityId={order.id}
                          assignedTeam={order.assigned_team}
                          compact
                        />
                      </TableCell>
                      <TableCell onClick={() => navigate(`/dashboard/orders/${order.id}`)}>
                        <WorkflowProgressBadge entityType="order" entityId={order.id} />
                      </TableCell>
                      <TableCell onClick={() => navigate(`/dashboard/orders/${order.id}`)}>
                        {order.order_items?.length || 0}
                      </TableCell>
                      <TableCell
                        className="font-medium"
                        onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                      >
                        {formatCurrency(order.total_value, order.currency)}
                      </TableCell>
                      <TableCell onClick={() => navigate(`/dashboard/orders/${order.id}`)}>
                        <span
                          className={
                            (order.profit_margin || 0) > 20
                              ? 'text-green-600'
                              : (order.profit_margin || 0) > 10
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }
                        >
                          {order.profit_margin?.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell onClick={() => navigate(`/dashboard/orders/${order.id}`)}>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell onClick={() => navigate(`/dashboard/orders/${order.id}`)}>
                        {order.delivery_date ? format(new Date(order.delivery_date), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/orders/${order.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/orders/${order.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteId(order.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Single Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be undone and will also
              delete all associated items and purchase orders.
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} orders? This action cannot be undone
              and will also delete all associated items, purchase orders, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              className="bg-destructive text-destructive-foreground"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
