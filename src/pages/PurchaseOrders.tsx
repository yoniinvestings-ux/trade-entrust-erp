import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { StatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { usePurchaseOrders, useDeletePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { TeamAssignmentCard } from '@/components/team/TeamAssignmentCard';
import { WorkflowProgressBadge } from '@/components/workflow/WorkflowProgressBadge';
import { format } from 'date-fns';
import { toast } from 'sonner';
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

const PO_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'production', label: 'Production' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [deleteItem, setDeleteItem] = useState<{ id: string; order_id: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  const supplierId = searchParams.get('supplierId');

  const { data: purchaseOrders, isLoading } = usePurchaseOrders({ search, status, supplierId: supplierId || undefined });
  const deletePO = useDeletePurchaseOrder();

  // Checkbox handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!purchaseOrders) return;
    if (selectedIds.length === purchaseOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(purchaseOrders.map(po => po.id));
    }
  };

  const handleBulkDelete = async () => {
    const selectedPOs = purchaseOrders?.filter(po => selectedIds.includes(po.id)) || [];
    let successCount = 0;
    for (const po of selectedPOs) {
      try {
        await deletePO.mutateAsync({ id: po.id, order_id: po.order_id });
        successCount++;
      } catch (error) {
        console.error('Failed to delete PO:', error);
      }
    }
    toast.success(`Deleted ${successCount} purchase order(s)`);
    setSelectedIds([]);
    setBulkDeleteDialogOpen(false);
  };
  
  // Clear supplier filter
  const clearSupplierFilter = () => {
    searchParams.delete('supplierId');
    setSearchParams(searchParams);
  };

  const handleDelete = async () => {
    if (deleteItem) {
      await deletePO.mutateAsync(deleteItem);
      setDeleteItem(null);
    }
  };

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description={supplierId && purchaseOrders?.[0]?.supplier?.supplier_name 
          ? `Showing POs for supplier: ${purchaseOrders[0].supplier.supplier_name}`
          : "Manage supplier purchase orders and track procurement"}
      >
        <div className="flex gap-2">
          {supplierId && (
            <Button variant="outline" onClick={clearSupplierFilter}>
              Clear Filter
            </Button>
          )}
          <Button onClick={() => navigate('/dashboard/purchase-orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New PO
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg font-medium">All Purchase Orders</CardTitle>
              {selectedIds.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedIds.length})
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search POs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {PO_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={purchaseOrders?.length ? selectedIds.length === purchaseOrders.length : false}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Linked Order</TableHead>
                  <TableHead>Total Value</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : purchaseOrders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No purchase orders found. Create your first PO to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseOrders?.map((po) => (
                    <TableRow 
                      key={po.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selectedIds.includes(po.id) ? 'bg-muted/30' : ''}`}
                      onClick={() => navigate(`/dashboard/purchase-orders/${po.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(po.id)}
                          onCheckedChange={() => toggleSelect(po.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {po.po_number}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {po.order?.sourcing_project?.project_title || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{po.supplier?.supplier_name || '-'}</p>
                          <p className="text-sm text-muted-foreground">
                            {po.supplier?.contact_person}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TeamAssignmentCard 
                          entityType="purchase_order" 
                          entityId={po.id} 
                          assignedTeam={(po as any).assigned_team}
                          compact
                        />
                      </TableCell>
                      <TableCell onClick={() => navigate(`/dashboard/purchase-orders/${po.id}`)}>
                        <WorkflowProgressBadge entityType="purchase_order" entityId={po.id} />
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="font-mono cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/orders/${po.order_id}`);
                          }}
                        >
                          <Link className="mr-1 h-3 w-3" />
                          {po.order?.order_number}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(po.total_value, po.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={po.status} />
                      </TableCell>
                      <TableCell>
                        {po.delivery_date 
                          ? format(new Date(po.delivery_date), 'MMM dd, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/purchase-orders/${po.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/purchase-orders/${po.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit PO
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteItem({ id: po.id, order_id: po.order_id })}
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

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this purchase order? This will also update the linked order's profit margin.
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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Purchase Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} purchase order(s)? This action cannot be undone and will update linked orders' profit margins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
