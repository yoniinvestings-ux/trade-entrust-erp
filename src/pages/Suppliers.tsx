import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
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
import { StatusPipeline } from '@/components/ui/status-pipeline';
import { Plus, Search, MoreHorizontal, Mail, Phone, MapPin, Factory, Star, DollarSign, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const RELIABILITY_OPTIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Average' },
  { value: 'poor', label: 'Poor' },
];

interface SupplierFormData {
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  wechat_id: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  rating: number;
  reliability: string;
  preferred_currency: string;
  wecom_webhook_url: string;
}

export default function Suppliers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [reliabilityFilter, setReliabilityFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<SupplierFormData>({
    supplier_name: '',
    contact_person: '',
    email: '',
    phone: '',
    wechat_id: '',
    street: '',
    city: '',
    state: '',
    country: '',
    zip_code: '',
    rating: 3,
    reliability: 'good',
    preferred_currency: 'RMB',
    wecom_webhook_url: '',
  });
  
  const queryClient = useQueryClient();

  // Fetch suppliers and PO aggregations
  const { data: suppliersWithTotals, isLoading } = useQuery({
    queryKey: ['suppliers-with-totals', search, reliabilityFilter],
    queryFn: async () => {
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('supplier_name', { ascending: true });

      if (reliabilityFilter !== 'all') {
        query = query.eq('reliability', reliabilityFilter);
      }

      if (search) {
        query = query.or(`supplier_name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`);
      }

      const { data: suppliers, error } = await query;
      if (error) throw error;

      // Get PO aggregations
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('supplier_id, total_value');

      // Calculate real totals
      const supplierTotals = (poData || []).reduce((acc, po) => {
        if (!acc[po.supplier_id]) {
          acc[po.supplier_id] = { count: 0, value: 0 };
        }
        acc[po.supplier_id].count++;
        acc[po.supplier_id].value += po.total_value || 0;
        return acc;
      }, {} as Record<string, { count: number; value: number }>);

      return suppliers?.map(s => ({
        ...s,
        calculated_pos: supplierTotals[s.id]?.count || 0,
        calculated_value: supplierTotals[s.id]?.value || 0,
      })) || [];
    },
  });

  // Calculate reliability counts
  const reliabilityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RELIABILITY_OPTIONS.forEach((r) => (counts[r.value] = 0));
    suppliersWithTotals?.forEach((supplier) => {
      if (counts[supplier.reliability] !== undefined) {
        counts[supplier.reliability]++;
      }
    });
    return counts;
  }, [suppliersWithTotals]);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete related POs first
      await supabase.from('purchase_orders').delete().in('supplier_id', ids);
      const { error } = await supabase.from('suppliers').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers-with-totals'] });
      toast.success(`${selectedIds.size} suppliers deleted`);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error('Failed to delete suppliers: ' + error.message);
    },
  });

  const createSupplier = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const { error } = await supabase.from('suppliers').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers-with-totals'] });
      toast.success('Supplier created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to create supplier: ' + error.message);
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...data }: SupplierFormData & { id: string }) => {
      const { error } = await supabase.from('suppliers').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers-with-totals'] });
      toast.success('Supplier updated successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to update supplier: ' + error.message);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    setFormData({
      supplier_name: '',
      contact_person: '',
      email: '',
      phone: '',
      wechat_id: '',
      street: '',
      city: '',
      state: '',
      country: '',
      zip_code: '',
      rating: 3,
      reliability: 'good',
      preferred_currency: 'RMB',
      wecom_webhook_url: '',
    });
  };

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone || '',
      wechat_id: supplier.wechat_id || '',
      street: supplier.street || '',
      city: supplier.city || '',
      state: supplier.state || '',
      country: supplier.country || '',
      zip_code: supplier.zip_code || '',
      rating: supplier.rating || 3,
      reliability: supplier.reliability || 'good',
      preferred_currency: supplier.preferred_currency || 'RMB',
      wecom_webhook_url: supplier.wecom_webhook_url || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingSupplier) {
      updateSupplier.mutate({ id: editingSupplier.id, ...formData });
    } else {
      createSupplier.mutate(formData);
    }
  };

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
    if (suppliersWithTotals && selectedIds.size === suppliersWithTotals.length) {
      setSelectedIds(new Set());
    } else if (suppliersWithTotals) {
      setSelectedIds(new Set(suppliersWithTotals.map(s => s.id)));
    }
  };

  const formatCurrency = (value: number, currency?: string) => {
    const currencyCode = currency || 'USD';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
      }).format(value);
    } catch {
      // Fallback for unsupported currency codes
      return `${currencyCode} ${value.toLocaleString()}`;
    }
  };

  const getReliabilityBadge = (reliability: string) => {
    const colors: Record<string, string> = {
      excellent: 'bg-green-500 text-white',
      good: 'bg-blue-500 text-white',
      average: 'bg-yellow-500 text-white',
      poor: 'bg-red-500 text-white',
    };
    return (
      <Badge className={colors[reliability] || colors.good}>
        {reliability.charAt(0).toUpperCase() + reliability.slice(1)}
      </Badge>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Suppliers" 
        description="Manage your supplier database and performance tracking"
      >
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Supplier
        </Button>
      </PageHeader>

      {/* Reliability Pipeline */}
      <StatusPipeline
        statuses={RELIABILITY_OPTIONS}
        counts={reliabilityCounts}
        activeStatus={reliabilityFilter}
        onStatusChange={setReliabilityFilter}
        allLabel="All Suppliers"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers by name, email, city, country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : suppliersWithTotals?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No suppliers found. Add your first supplier to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={suppliersWithTotals && suppliersWithTotals.length > 0 && selectedIds.size === suppliersWithTotals.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Reliability</TableHead>
                    <TableHead>POs</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersWithTotals?.map((supplier) => (
                    <TableRow key={supplier.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(supplier.id)}
                          onCheckedChange={() => toggleSelect(supplier.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{supplier.supplier_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{supplier.contact_person}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </span>
                            {supplier.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {supplier.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.city && supplier.country ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {supplier.city}, {supplier.country}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {renderStars(supplier.rating || 3)}
                      </TableCell>
                      <TableCell>
                        {getReliabilityBadge(supplier.reliability || 'good')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{supplier.calculated_pos}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatCurrency(supplier.calculated_value, supplier.preferred_currency)}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                              Edit Supplier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/purchase-orders?supplierId=${supplier.id}`)}>View Purchase Orders</DropdownMenuItem>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Create New Supplier'}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Update supplier information' : 'Add a new supplier to your database'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_name">Supplier Name *</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Shenzhen Electronics Co"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Li Wei"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@supplier.cn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+86-755-8888001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wechat_id">WeChat ID</Label>
                <Input
                  id="wechat_id"
                  value={formData.wechat_id}
                  onChange={(e) => setFormData({ ...formData, wechat_id: e.target.value })}
                  placeholder="supplier_wechat"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="888 Tech Park"
              />
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Shenzhen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="GD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="China"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">Zip Code</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="518000"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Rating (1-5)</Label>
                <Select 
                  value={formData.rating.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, rating: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} Stars</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reliability">Reliability</Label>
                <Select 
                  value={formData.reliability} 
                  onValueChange={(v) => setFormData({ ...formData, reliability: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELIABILITY_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Preferred Currency</Label>
                <Select 
                  value={formData.preferred_currency} 
                  onValueChange={(v) => setFormData({ ...formData, preferred_currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RMB">RMB (¥)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* WeCom Integration Section */}
            <div className="col-span-2 space-y-2 pt-4 border-t">
              <Label className="text-base font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                企业微信集成 / WeCom Integration
              </Label>
              <div className="space-y-2">
                <Label htmlFor="wecom_webhook_url">WeCom Webhook URL</Label>
                <Input
                  id="wecom_webhook_url"
                  value={formData.wecom_webhook_url}
                  onChange={(e) => setFormData({ ...formData, wecom_webhook_url: e.target.value })}
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                />
                <p className="text-xs text-muted-foreground">
                  Enter the WeCom group robot webhook URL to enable factory notifications
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.supplier_name || !formData.contact_person || !formData.email}>
              {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Suppliers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} suppliers? This will also delete all their purchase orders.
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
