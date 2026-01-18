import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Save, Building2, FileText, User, Calendar, CheckCircle2, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useServiceRequest,
  useUpdateServiceRequest,
  useResolveServiceRequest,
  SERVICE_REQUEST_TYPES,
  SERVICE_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '@/hooks/useAfterSales';
import { useTeamMembersList } from '@/hooks/useTeamMembers';
import { EntityUpdatesPanel } from '@/components/updates/EntityUpdatesPanel';

export default function ServiceRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: request, isLoading } = useServiceRequest(id);
  const updateRequest = useUpdateServiceRequest();
  const resolveRequest = useResolveServiceRequest();
  const { data: teamMembers } = useTeamMembersList();

  const [isEditing, setIsEditing] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [editData, setEditData] = useState({
    status: '',
    priority: '',
    request_type: '',
    description: '',
    assigned_to: '',
  });

  const startEdit = () => {
    if (!request) return;
    setEditData({
      status: request.status,
      priority: request.priority,
      request_type: request.request_type,
      description: request.description || '',
      assigned_to: request.assigned_to || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!request) return;
    try {
      await updateRequest.mutateAsync({
        id: request.id,
        ...editData,
        assigned_to: editData.assigned_to || null,
      });
      setIsEditing(false);
      toast.success('Request updated / 请求已更新');
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleResolve = async () => {
    if (!request || !resolutionNotes) {
      toast.error('Please provide resolution notes');
      return;
    }
    try {
      await resolveRequest.mutateAsync({
        id: request.id,
        resolution_notes: resolutionNotes,
      });
      setResolveDialogOpen(false);
      toast.success('Request resolved / 请求已解决');
    } catch (error: any) {
      toast.error('Failed to resolve: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Request not found</h2>
        <Button variant="link" onClick={() => navigate('/dashboard/qc/after-sales')}>
          Back to After-Sales
        </Button>
      </div>
    );
  }

  const statusOpt = SERVICE_STATUS_OPTIONS.find((o) => o.value === request.status);
  const priorityOpt = PRIORITY_OPTIONS.find((o) => o.value === request.priority);
  const typeOpt = SERVICE_REQUEST_TYPES.find((o) => o.value === request.request_type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/qc/after-sales')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Service Request</h1>
              <Badge className={`${priorityOpt?.color} text-white`}>
                {priorityOpt?.label.split(' / ')[0]}
              </Badge>
              <Badge variant="outline" className={`${statusOpt?.color} text-white border-0`}>
                {statusOpt?.label.split(' / ')[0]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {typeOpt?.label} • {request.customer?.company_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {request.status !== 'resolved' && request.status !== 'closed' && (
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Resolve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Resolve Service Request</DialogTitle>
                  <DialogDescription>
                    Provide resolution notes before closing this request
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Resolution Notes / 解决说明 *</Label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Describe how the issue was resolved..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleResolve} disabled={resolveRequest.isPending}>
                    Mark Resolved
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {!isEditing ? (
            <Button variant="outline" onClick={startEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateRequest.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium truncate">{request.customer?.company_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order</p>
                {request.order ? (
                  <Badge
                    variant="outline"
                    className="font-mono cursor-pointer"
                    onClick={() => navigate(`/dashboard/orders/${request.order?.id}`)}
                  >
                    {request.order.order_number}
                  </Badge>
                ) : (
                  <p className="font-medium">N/A</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p className="font-medium">
                  {request.assigned_profile?.display_name || 'Unassigned'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(request.created_at), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details / 请求详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={editData.status}
                        onValueChange={(v) => setEditData({ ...editData, status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={editData.priority}
                        onValueChange={(v) => setEditData({ ...editData, priority: v })}
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
                      <Label>Request Type</Label>
                      <Select
                        value={editData.request_type}
                        onValueChange={(v) => setEditData({ ...editData, request_type: v })}
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
                      <Label>Assigned To</Label>
                      <Select
                        value={editData.assigned_to}
                        onValueChange={(v) => setEditData({ ...editData, assigned_to: v })}
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
                    <Label>Description / 描述</Label>
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Description / 描述</h4>
                    <p className="whitespace-pre-wrap">{request.description || 'No description provided'}</p>
                  </div>
                  {request.resolution_notes && (
                    <>
                      <Separator />
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <h4 className="font-medium text-green-800 dark:text-green-200">Resolution Notes</h4>
                        </div>
                        <p className="whitespace-pre-wrap text-green-700 dark:text-green-300">{request.resolution_notes}</p>
                        {request.resolved_at && (
                          <p className="text-xs text-green-600 mt-2">
                            Resolved on {format(new Date(request.resolved_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{request.customer?.company_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{request.customer?.contact_person}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{request.customer?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <div className="flex items-center gap-2">
                    {request.created_on_behalf ? (
                      <>
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Sales ({request.created_by_profile?.display_name})</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>Customer Portal</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Updates Panel */}
        <div>
          <EntityUpdatesPanel entityType="order" entityId={id!} />
        </div>
      </div>
    </div>
  );
}
