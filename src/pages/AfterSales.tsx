import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Headphones, Clock, CheckCircle2, AlertCircle, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  useServiceRequests,
  useCreateServiceRequest,
  SERVICE_REQUEST_TYPES,
  SERVICE_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '@/hooks/useAfterSales';
import { useTeamMembersList } from '@/hooks/useTeamMembers';

export default function AfterSales() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: requests, isLoading } = useServiceRequests({
    status: statusFilter,
    type: typeFilter,
    priority: priorityFilter,
  });
  const createRequest = useCreateServiceRequest();
  const { data: teamMembers } = useTeamMembersList();

  // Fetch customers for the form
  const { data: customers } = useQuery({
    queryKey: ['customers-for-service'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_person')
        .order('company_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders for the form (based on selected customer)
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const { data: customerOrders } = useQuery({
    queryKey: ['orders-for-service', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, sourcing_project:sourcing_projects(project_title)')
        .eq('customer_id', selectedCustomerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId,
  });

  const [formData, setFormData] = useState({
    customer_id: '',
    order_id: '',
    request_type: 'after_sales',
    priority: 'normal',
    description: '',
    assigned_to: '',
  });

  const handleCreateRequest = async () => {
    if (!formData.customer_id || !formData.description) {
      toast.error('Please select a customer and provide a description');
      return;
    }

    try {
      await createRequest.mutateAsync({
        customer_id: formData.customer_id,
        order_id: formData.order_id || undefined,
        request_type: formData.request_type,
        priority: formData.priority,
        description: formData.description,
        assigned_to: formData.assigned_to || undefined,
        created_on_behalf: true,
      });
      toast.success('Service request created / 服务请求已创建');
      setDialogOpen(false);
      setFormData({
        customer_id: '',
        order_id: '',
        request_type: 'after_sales',
        priority: 'normal',
        description: '',
        assigned_to: '',
      });
      setSelectedCustomerId('');
    } catch (error: any) {
      toast.error('Failed to create request: ' + error.message);
    }
  };

  // Filter requests by search
  const filteredRequests = requests?.filter((req) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      req.customer?.company_name?.toLowerCase().includes(searchLower) ||
      req.order?.order_number?.toLowerCase().includes(searchLower) ||
      req.description?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const pendingCount = requests?.filter((r) => r.status === 'pending').length || 0;
  const inProgressCount = requests?.filter((r) => r.status === 'in_progress').length || 0;
  const resolvedCount = requests?.filter((r) => r.status === 'resolved').length || 0;
  const urgentCount = requests?.filter((r) => r.priority === 'urgent' && r.status !== 'resolved' && r.status !== 'closed').length || 0;

  const getStatusBadge = (status: string) => {
    const opt = SERVICE_STATUS_OPTIONS.find((o) => o.value === status);
    return (
      <Badge variant="outline" className={`${opt?.color} text-white border-0`}>
        {opt?.label.split(' / ')[0]}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const opt = PRIORITY_OPTIONS.find((o) => o.value === priority);
    return (
      <Badge className={`${opt?.color} text-white`}>
        {opt?.label.split(' / ')[0]}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    return SERVICE_REQUEST_TYPES.find((t) => t.value === type)?.label.split(' / ')[0] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">After-Sales Service / 售后服务</h1>
          <p className="text-muted-foreground">
            Manage customer service requests and after-sales support
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Service Request (On Behalf of Customer)</DialogTitle>
              <DialogDescription>
                Create a new service request for a customer who contacted you directly
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Customer / 客户 *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(v) => {
                    setFormData({ ...formData, customer_id: v, order_id: '' });
                    setSelectedCustomerId(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name} ({c.contact_person})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Request Type / 请求类型</Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(v) => setFormData({ ...formData, request_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_REQUEST_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority / 优先级</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
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
                  <Label>Related Order / 关联订单</Label>
                  <Select
                    value={formData.order_id}
                    onValueChange={(v) => setFormData({ ...formData, order_id: v })}
                    disabled={!selectedCustomerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCustomerId ? 'Select order' : 'Select customer first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {customerOrders?.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.order_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To / 分配给</Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers?.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description / 描述 *</Label>
                <Textarea
                  placeholder="Describe the customer's issue or request..."
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
              <Button onClick={handleCreateRequest} disabled={createRequest.isPending}>
                Create Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Pending"
          value={pendingCount}
          icon={Clock}
          description={pendingCount > 0 ? "Needs attention" : undefined}
        />
        <MetricCard
          title="In Progress"
          value={inProgressCount}
          icon={Headphones}
        />
        <MetricCard
          title="Urgent"
          value={urgentCount}
          icon={AlertCircle}
          className={urgentCount > 0 ? 'border-red-500' : ''}
        />
        <MetricCard
          title="Resolved"
          value={resolvedCount}
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
                placeholder="Search customer, order, description..."
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
                <SelectItem value="all">All Status</SelectItem>
                {SERVICE_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {SERVICE_REQUEST_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {PRIORITY_OPTIONS.map((opt) => (
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
          ) : filteredRequests?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Service Requests</h3>
              <p className="text-muted-foreground">
                {search ? 'Try adjusting your search' : 'Create your first service request'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests?.map((req) => (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/qc/after-sales/${req.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{req.customer?.company_name}</p>
                          <p className="text-xs text-muted-foreground">{req.customer?.contact_person}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(req.request_type)}</Badge>
                    </TableCell>
                    <TableCell>{getPriorityBadge(req.priority)}</TableCell>
                    <TableCell>
                      {req.order ? (
                        <Badge variant="outline" className="font-mono">
                          {req.order.order_number}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {(req.order as any)?.sourcing_project?.project_title || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {req.description}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell>
                      {req.created_on_behalf ? (
                        <div className="flex items-center gap-1 text-xs">
                          <User className="h-3 w-3" />
                          <span>Sales</span>
                        </div>
                      ) : (
                        <span className="text-xs">Customer</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(req.created_at), 'MMM dd, yyyy')}
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
