import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, AlertTriangle, CheckCircle2, Clock, FileWarning, Building2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/ui/metric-card';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useNCRReports,
  useCreateNCR,
  NCR_SEVERITY_OPTIONS,
  NCR_CATEGORY_OPTIONS,
  NCR_STATUS_OPTIONS,
} from '@/hooks/useNCR';

export default function QCCorrectiveActions() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: ncrs, isLoading } = useNCRReports({
    status: statusFilter,
    severity: severityFilter,
  });
  const createNCR = useCreateNCR();

  // Fetch suppliers and orders for the form
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-for-ncr'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, supplier_name')
        .order('supplier_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ['orders-for-ncr'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer:customers(company_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'minor',
    category: 'quality',
    supplier_id: '',
    order_id: '',
    due_date: '',
  });

  const handleCreateNCR = async () => {
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }

    try {
      await createNCR.mutateAsync({
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        category: formData.category,
        supplier_id: formData.supplier_id || undefined,
        order_id: formData.order_id || undefined,
        due_date: formData.due_date || undefined,
      });
      toast.success('NCR created successfully / NCR已创建');
      setDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        severity: 'minor',
        category: 'quality',
        supplier_id: '',
        order_id: '',
        due_date: '',
      });
    } catch (error: any) {
      toast.error('Failed to create NCR: ' + error.message);
    }
  };

  // Filter NCRs by search
  const filteredNCRs = ncrs?.filter((ncr) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      ncr.ncr_number.toLowerCase().includes(searchLower) ||
      ncr.title.toLowerCase().includes(searchLower) ||
      ncr.supplier?.supplier_name?.toLowerCase().includes(searchLower) ||
      ncr.order?.order_number?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const openCount = ncrs?.filter((n) => n.status === 'open').length || 0;
  const inProgressCount = ncrs?.filter((n) => ['investigating', 'pending_action', 'action_in_progress', 'verification'].includes(n.status)).length || 0;
  const criticalCount = ncrs?.filter((n) => n.severity === 'critical' && n.status !== 'closed').length || 0;
  const closedCount = ncrs?.filter((n) => n.status === 'closed').length || 0;

  const getSeverityBadge = (severity: string) => {
    const opt = NCR_SEVERITY_OPTIONS.find((o) => o.value === severity);
    return (
      <Badge className={`${opt?.color} text-white`}>
        {opt?.label.split(' / ')[0]}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const opt = NCR_STATUS_OPTIONS.find((o) => o.value === status);
    return (
      <Badge variant="outline" className={`${opt?.color} text-white border-0`}>
        {opt?.label.split(' / ')[0]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corrective Actions (NCR) / 纠正措施</h1>
          <p className="text-muted-foreground">
            Track and manage non-conformance reports and corrective actions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New NCR
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Non-Conformance Report</DialogTitle>
              <DialogDescription>
                Record a new quality issue or non-conformance for tracking and resolution
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Title / 标题 *</Label>
                <Input
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity / 严重程度</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(v) => setFormData({ ...formData, severity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NCR_SEVERITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category / 类别</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NCR_CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier / 供应商</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.supplier_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Related Order / 关联订单</Label>
                  <Select
                    value={formData.order_id}
                    onValueChange={(v) => setFormData({ ...formData, order_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders?.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.order_number} - {o.customer?.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date / 截止日期</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description / 描述</Label>
                <Textarea
                  placeholder="Detailed description of the non-conformance..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNCR} disabled={createNCR.isPending}>
                Create NCR
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Open NCRs"
          value={openCount}
          icon={FileWarning}
          description={openCount > 0 ? "Needs attention" : undefined}
        />
        <MetricCard
          title="In Progress"
          value={inProgressCount}
          icon={Clock}
        />
        <MetricCard
          title="Critical Issues"
          value={criticalCount}
          icon={AlertTriangle}
          className={criticalCount > 0 ? 'border-red-500' : ''}
        />
        <MetricCard
          title="Closed This Month"
          value={closedCount}
          icon={CheckCircle2}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search NCR number, title, supplier, order..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {NCR_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {NCR_SEVERITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredNCRs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No NCRs Found</h3>
              <p className="text-muted-foreground">
                {search ? 'Try adjusting your search' : 'Create your first NCR to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NCR #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNCRs?.map((ncr) => (
                  <TableRow
                    key={ncr.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/qc/corrective-actions/${ncr.id}`)}
                  >
                    <TableCell className="font-mono font-medium">
                      {ncr.ncr_number}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {ncr.title}
                    </TableCell>
                    <TableCell>{getSeverityBadge(ncr.severity)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {NCR_CATEGORY_OPTIONS.find((c) => c.value === ncr.category)?.label.split(' / ')[0]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ncr.supplier ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {ncr.supplier.supplier_name}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {ncr.order ? (
                        <Badge variant="outline" className="font-mono">
                          {ncr.order.order_number}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(ncr.status)}</TableCell>
                    <TableCell>
                      {ncr.due_date ? (
                        <span className={new Date(ncr.due_date) < new Date() && ncr.status !== 'closed' ? 'text-red-500 font-medium' : ''}>
                          {format(new Date(ncr.due_date), 'MMM dd, yyyy')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(ncr.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
