import { useState } from 'react';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Search, MoreHorizontal, ClipboardCheck, AlertTriangle, CheckCircle, 
  XCircle, CalendarIcon, Filter, X, Eye, FileText, ChevronDown, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { QCInspectionScheduleDialog } from '@/components/qc/QCInspectionScheduleDialog';
import { INSPECTION_TYPES, CONCLUSION_OPTIONS } from '@/hooks/useQCInspections';

const QC_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500', icon: ClipboardCheck },
  { value: 'passed', label: 'Passed', color: 'bg-green-500', icon: CheckCircle },
  { value: 'failed', label: 'Failed', color: 'bg-red-500', icon: XCircle },
];

export default function QCInspections() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Search and filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [poFilter, setPoFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Fetch QC inspections with related order and PO data
  const { data: inspections, isLoading } = useQuery({
    queryKey: ['qc-inspections', search, statusFilter, typeFilter, orderFilter, poFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('qc_inspections')
        .select(`
          *,
          order:orders(id, order_number, customer:customers(company_name)),
          purchase_order:purchase_orders(id, po_number, supplier:suppliers(supplier_name))
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (typeFilter !== 'all') {
        query = query.eq('inspection_type', typeFilter);
      }
      
      if (orderFilter !== 'all') {
        query = query.eq('order_id', orderFilter);
      }
      
      if (poFilter !== 'all') {
        query = query.eq('po_id', poFilter);
      }

      if (dateFrom) {
        query = query.gte('inspection_date', startOfDay(dateFrom).toISOString());
      }
      
      if (dateTo) {
        query = query.lte('inspection_date', endOfDay(dateTo).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Client-side search filtering
      if (search) {
        const searchLower = search.toLowerCase();
        return data?.filter(i => 
          i.order?.order_number?.toLowerCase().includes(searchLower) ||
          i.order?.customer?.company_name?.toLowerCase().includes(searchLower) ||
          i.purchase_order?.po_number?.toLowerCase().includes(searchLower) ||
          i.purchase_order?.supplier?.supplier_name?.toLowerCase().includes(searchLower) ||
          i.location?.toLowerCase().includes(searchLower)
        );
      }
      
      return data;
    },
  });

  // Fetch orders for filter dropdown
  const { data: orders } = useQuery({
    queryKey: ['orders-for-qc-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer:customers(company_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch POs for filter dropdown
  const { data: purchaseOrders } = useQuery({
    queryKey: ['pos-for-qc-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, supplier:suppliers(supplier_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Bulk update mutation
  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from('qc_inspections')
        .update({ status })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qc-inspections'] });
      toast.success(`${variables.ids.length} inspection(s) updated to ${variables.status}`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error('Failed to update inspections: ' + error.message);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && inspections) {
      setSelectedIds(inspections.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const handleBulkStatusUpdate = (status: string) => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one inspection');
      return;
    }
    bulkUpdateStatus.mutate({ ids: selectedIds, status });
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setOrderFilter('all');
    setPoFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || 
    orderFilter !== 'all' || poFilter !== 'all' || dateFrom || dateTo || search;

  const getStatusBadge = (status: string) => {
    const statusConfig = QC_STATUSES.find(s => s.value === status);
    const Icon = statusConfig?.icon || ClipboardCheck;
    return (
      <Badge variant="secondary" className={`${statusConfig?.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = INSPECTION_TYPES.find(t => t.value === type);
    return (
      <Badge variant="outline">
        {typeConfig?.label || type}
      </Badge>
    );
  };

  const getConclusionBadge = (conclusion: string | null) => {
    if (!conclusion) return null;
    const conclusionConfig = CONCLUSION_OPTIONS.find(c => c.value === conclusion);
    return (
      <Badge className={`${conclusionConfig?.color} text-white`}>
        {conclusionConfig?.label || conclusion}
      </Badge>
    );
  };

  const getDefectRateColor = (rate: number) => {
    if (rate <= 1) return 'text-green-600';
    if (rate <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Stats
  const stats = {
    total: inspections?.length || 0,
    pending: inspections?.filter(i => i.status === 'pending').length || 0,
    inProgress: inspections?.filter(i => i.status === 'in_progress').length || 0,
    passed: inspections?.filter(i => i.status === 'passed').length || 0,
    failed: inspections?.filter(i => i.status === 'failed').length || 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="QC Inspections / 质量检验" 
        description="Track and manage quality control inspections for orders"
      >
        <QCInspectionScheduleDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['qc-inspections'] })}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Inspection
          </Button>
        </QCInspectionScheduleDialog>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('all')}>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('pending')}>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('in_progress')}>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('passed')}>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('failed')}>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order, customer, PO, supplier, or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {QC_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant={showFilters ? "default" : "outline"} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                    !
                  </Badge>
                )}
              </Button>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Inspection Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {INSPECTION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order</label>
                  <Select value={orderFilter} onValueChange={setOrderFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Orders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      {orders?.map(order => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Purchase Order</label>
                  <Select value={poFilter} onValueChange={setPoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All POs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All POs</SelectItem>
                      {purchaseOrders?.map(po => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.po_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !dateFrom && "text-muted-foreground"
                        )}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, 'MMM d') : 'From'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !dateTo && "text-muted-foreground"
                        )}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, 'MMM d') : 'To'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {hasActiveFilters && (
                  <div className="md:col-span-4">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-4 p-3 mb-4 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">
                {selectedIds.length} inspection(s) selected
              </span>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Update Status
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {QC_STATUSES.map(status => (
                      <DropdownMenuItem 
                        key={status.value} 
                        onClick={() => handleBulkStatusUpdate(status.value)}
                      >
                        <status.icon className="h-4 w-4 mr-2" />
                        {status.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedIds([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : inspections?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No inspections found. Schedule your first inspection to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={inspections?.length > 0 && selectedIds.length === inspections?.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Order / Customer</TableHead>
                    <TableHead>Purchase Order</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conclusion</TableHead>
                    <TableHead>Defect Rate</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections?.map((inspection) => (
                    <TableRow 
                      key={inspection.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/qc/inspections/${inspection.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(inspection.id)}
                          onCheckedChange={(checked) => handleSelectOne(inspection.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono font-medium">{inspection.order?.order_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {inspection.order?.customer?.company_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {inspection.purchase_order ? (
                          <div>
                            <div className="font-mono text-sm">{inspection.purchase_order.po_number}</div>
                            <div className="text-xs text-muted-foreground">
                              {inspection.purchase_order.supplier?.supplier_name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(inspection.inspection_type || 'final')}
                      </TableCell>
                      <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                      <TableCell>
                        {getConclusionBadge(inspection.conclusion)}
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${getDefectRateColor(inspection.defect_rate || 0)}`}>
                          {(inspection.defect_rate || 0).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {inspection.scheduled_date 
                          ? format(new Date(inspection.scheduled_date), 'MMM d, yyyy')
                          : format(new Date(inspection.inspection_date), 'MMM d, yyyy')
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
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/qc/inspections/${inspection.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/qc/inspections/${inspection.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Generate Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {QC_STATUSES.map(status => (
                              <DropdownMenuItem 
                                key={status.value}
                                onClick={() => bulkUpdateStatus.mutate({ ids: [inspection.id], status: status.value })}
                              >
                                <status.icon className="h-4 w-4 mr-2" />
                                Mark as {status.label}
                              </DropdownMenuItem>
                            ))}
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
    </div>
  );
}
