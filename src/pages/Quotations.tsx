import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, MoreHorizontal, FileText, Send, CheckCircle, XCircle, ShoppingCart, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TeamAssignmentCard } from '@/components/team/TeamAssignmentCard';

const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-500' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'expired', label: 'Expired', color: 'bg-orange-500' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-500' },
];

interface ConversionDialogState {
  open: boolean;
  quotation: any | null;
  needsCustomer: boolean;
}

export default function Quotations() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  
  // Conversion dialog state
  const [conversionDialog, setConversionDialog] = useState<ConversionDialogState>({
    open: false,
    quotation: null,
    needsCustomer: false,
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [createNewCustomer, setCreateNewCustomer] = useState(false);

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['quotations', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('quotations')
        .select(`
          *,
          lead:leads(id, company_name, contact_person, email, phone),
          customer:customers(id, company_name, contact_person),
          sourcing_project:sourcing_projects(id, project_title),
          quotation_items(id, product_name, model_number, quantity, unit_price, specifications)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.ilike('quotation_number', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch customers for conversion
  const { data: customers } = useQuery({
    queryKey: ['customers-for-conversion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_person')
        .order('company_name');
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, sent_at }: { id: string; status: string; sent_at?: string }) => {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (sent_at) updateData.sent_at = sent_at;
      
      const { error } = await supabase.from('quotations').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation updated');
    },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const convertToOrder = useMutation({
    mutationFn: async ({ quotation, customerId }: { quotation: any; customerId: string }) => {
      // Update quotation status to converted
      const { error: statusError } = await supabase
        .from('quotations')
        .update({ 
          status: 'converted',
          updated_at: new Date().toISOString()
        })
        .eq('id', quotation.id);
      
      if (statusError) throw statusError;

      // If quotation was linked to a lead, update lead status
      if (quotation.lead_id) {
        await supabase
          .from('leads')
          .update({ 
            status: 'won',
            converted_to_customer_id: customerId,
            converted_at: new Date().toISOString()
          })
          .eq('id', quotation.lead_id);
      }

      return { quotation, customerId };
    },
    onSuccess: ({ quotation, customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      // Navigate to order form with quotation data
      navigate('/dashboard/orders/new', { 
        state: { 
          fromQuotation: quotation.id,
          customerId: customerId,
          quotationItems: quotation.quotation_items,
          tradeTerm: quotation.trade_term,
          currency: quotation.currency,
          sourcingProjectId: quotation.sourcing_project_id,
        }
      });
    },
    onError: (error) => toast.error('Failed to convert: ' + error.message),
  });

  const createCustomerAndConvert = useMutation({
    mutationFn: async (quotation: any) => {
      if (!quotation.lead) throw new Error('No lead data available');
      
      // Create customer from lead
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          company_name: quotation.lead.company_name,
          contact_person: quotation.lead.contact_person,
          email: quotation.lead.email,
          phone: quotation.lead.phone,
          status: 'active',
        })
        .select()
        .single();
      
      if (customerError) throw customerError;
      
      return { quotation, customerId: customer.id };
    },
    onSuccess: ({ quotation, customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created from lead');
      convertToOrder.mutate({ quotation, customerId });
    },
    onError: (error) => toast.error('Failed to create customer: ' + error.message),
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      // Delete quotation_items first
      const { error: itemsError } = await supabase
        .from('quotation_items')
        .delete()
        .in('quotation_id', ids);
      if (itemsError) throw itemsError;
      
      // Delete quotations
      const { error } = await supabase
        .from('quotations')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      toast.success(`${selectedIds.size} quotation(s) deleted`);
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === quotations?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(quotations?.map(q => q.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    const config = QUOTATION_STATUSES.find(s => s.value === status);
    return (
      <Badge variant="secondary" className={`${config?.color} text-white`}>
        {config?.label || status}
      </Badge>
    );
  };

  const formatCurrency = (value: number | null, currency: string = 'USD') => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  };

  const handleMarkAsSent = (id: string) => {
    updateStatus.mutate({ id, status: 'sent', sent_at: new Date().toISOString() });
  };

  const handleConvertToOrder = (quotation: any) => {
    // If quotation is linked to a customer, convert directly
    if (quotation.customer_id) {
      convertToOrder.mutate({ quotation, customerId: quotation.customer_id });
    } else if (quotation.lead) {
      // If linked to a lead, show conversion dialog
      setConversionDialog({
        open: true,
        quotation,
        needsCustomer: true,
      });
      setCreateNewCustomer(true);
      setSelectedCustomerId('');
    } else {
      // No customer or lead, show customer selection dialog
      setConversionDialog({
        open: true,
        quotation,
        needsCustomer: true,
      });
      setCreateNewCustomer(false);
      setSelectedCustomerId('');
    }
  };

  const handleConfirmConversion = () => {
    if (!conversionDialog.quotation) return;

    if (createNewCustomer && conversionDialog.quotation.lead) {
      createCustomerAndConvert.mutate(conversionDialog.quotation);
    } else if (selectedCustomerId) {
      convertToOrder.mutate({ 
        quotation: conversionDialog.quotation, 
        customerId: selectedCustomerId 
      });
    } else {
      toast.error('Please select a customer');
      return;
    }

    setConversionDialog({ open: false, quotation: null, needsCustomer: false });
  };

  const isConverting = convertToOrder.isPending || createCustomerAndConvert.isPending;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Quotations" 
        description="Manage customer quotations and pricing"
      >
        <Button onClick={() => navigate('/dashboard/quotations/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Quotation
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {QUOTATION_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg mb-4">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : quotations?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No quotations found. Create your first quotation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={quotations && quotations.length > 0 && selectedIds.size === quotations.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Customer/Lead</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Sourcing Project</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations?.map((quotation) => (
                    <TableRow key={quotation.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(quotation.id)}
                          onCheckedChange={() => toggleSelect(quotation.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {quotation.quotation_number}
                      </TableCell>
                      <TableCell>
                        {quotation.customer ? (
                          <div>
                            <div className="font-medium">{quotation.customer.company_name}</div>
                            <div className="text-xs text-muted-foreground">{quotation.customer.contact_person}</div>
                          </div>
                        ) : quotation.lead ? (
                          <div>
                            <div className="font-medium">{quotation.lead.company_name}</div>
                            <div className="text-xs text-muted-foreground">{quotation.lead.contact_person}</div>
                            <Badge variant="outline" className="text-xs mt-1">Lead</Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TeamAssignmentCard 
                          entityType="quotation" 
                          entityId={quotation.id} 
                          assignedTeam={(quotation as any).assigned_team}
                          compact
                        />
                      </TableCell>
                      <TableCell>
                        {quotation.sourcing_project ? (
                          <span className="text-sm">{quotation.sourcing_project.project_title}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{quotation.quotation_items?.length || 0} items</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(quotation.total_value, quotation.currency || 'USD')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {quotation.valid_until 
                          ? format(new Date(quotation.valid_until), 'MMM d, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/quotations/${quotation.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/quotations/${quotation.id}/edit`)}>
                              Edit Quotation
                            </DropdownMenuItem>
                            
                            {quotation.status === 'draft' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleMarkAsSent(quotation.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Mark as Sent
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {quotation.status === 'sent' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: quotation.id, status: 'accepted' })}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Mark Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: quotation.id, status: 'rejected' })}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                  Mark Rejected
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {['accepted', 'sent'].includes(quotation.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleConvertToOrder(quotation)}
                                  className="text-primary"
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Convert to Order
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Dialog */}
      <Dialog open={conversionDialog.open} onOpenChange={(open) => setConversionDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Convert to Order
            </DialogTitle>
            <DialogDescription>
              {conversionDialog.quotation?.lead 
                ? 'This quotation is linked to a lead. Choose how to proceed with the customer.'
                : 'Select a customer for this order.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Quotation info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quotation</span>
                <span className="font-mono font-medium">{conversionDialog.quotation?.quotation_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="font-medium">
                  {formatCurrency(conversionDialog.quotation?.total_value, conversionDialog.quotation?.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Items</span>
                <span>{conversionDialog.quotation?.quotation_items?.length || 0} items</span>
              </div>
            </div>

            {/* Customer selection */}
            {conversionDialog.quotation?.lead ? (
              <div className="space-y-3">
                <Label>Customer Option</Label>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant={createNewCustomer ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => {
                      setCreateNewCustomer(true);
                      setSelectedCustomerId('');
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create customer from lead: {conversionDialog.quotation?.lead?.company_name}
                  </Button>
                  <Button
                    type="button"
                    variant={!createNewCustomer ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => setCreateNewCustomer(false)}
                  >
                    Select existing customer
                  </Button>
                </div>

                {!createNewCustomer && (
                  <div className="space-y-2 mt-3">
                    <Label>Select Customer</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.company_name} - {customer.contact_person}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Customer *</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name} - {customer.contact_person}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConversionDialog({ open: false, quotation: null, needsCustomer: false })}
              disabled={isConverting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmConversion}
              disabled={isConverting || (!createNewCustomer && !selectedCustomerId)}
            >
              {isConverting ? 'Converting...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} quotation(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected quotations
              and all their items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
