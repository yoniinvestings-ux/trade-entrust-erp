import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Save, AlertTriangle, Building2, FileText, Calendar, User, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useNCRReport,
  useUpdateNCR,
  useCloseNCR,
  NCR_SEVERITY_OPTIONS,
  NCR_CATEGORY_OPTIONS,
  NCR_STATUS_OPTIONS,
} from '@/hooks/useNCR';
import { useTeamMembersList } from '@/hooks/useTeamMembers';
import { EntityUpdatesPanel } from '@/components/updates/EntityUpdatesPanel';

export default function NCRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ncr, isLoading } = useNCRReport(id);
  const updateNCR = useUpdateNCR();
  const closeNCR = useCloseNCR();
  const { data: teamMembers } = useTeamMembersList();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    severity: '',
    category: '',
    title: '',
    description: '',
    root_cause: '',
    corrective_action: '',
    preventive_action: '',
    assigned_to: '',
    due_date: '',
    cost_impact: 0,
  });

  const startEdit = () => {
    if (!ncr) return;
    setEditData({
      status: ncr.status,
      severity: ncr.severity,
      category: ncr.category,
      title: ncr.title,
      description: ncr.description || '',
      root_cause: ncr.root_cause || '',
      corrective_action: ncr.corrective_action || '',
      preventive_action: ncr.preventive_action || '',
      assigned_to: ncr.assigned_to || '',
      due_date: ncr.due_date || '',
      cost_impact: ncr.cost_impact,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!ncr) return;
    try {
      await updateNCR.mutateAsync({
        id: ncr.id,
        ...editData,
        severity: editData.severity as 'critical' | 'major' | 'minor',
        assigned_to: editData.assigned_to || null,
      } as any);
      setIsEditing(false);
      toast.success('NCR updated / NCR已更新');
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleClose = async () => {
    if (!ncr) return;
    try {
      await closeNCR.mutateAsync({ id: ncr.id });
      toast.success('NCR closed / NCR已关闭');
    } catch (error: any) {
      toast.error('Failed to close: ' + error.message);
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

  if (!ncr) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">NCR not found</h2>
        <Button variant="link" onClick={() => navigate('/dashboard/qc/corrective-actions')}>
          Back to NCRs
        </Button>
      </div>
    );
  }

  const severityOpt = NCR_SEVERITY_OPTIONS.find((o) => o.value === ncr.severity);
  const statusOpt = NCR_STATUS_OPTIONS.find((o) => o.value === ncr.status);
  const categoryOpt = NCR_CATEGORY_OPTIONS.find((o) => o.value === ncr.category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/qc/corrective-actions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{ncr.ncr_number}</h1>
              <Badge className={`${severityOpt?.color} text-white`}>
                {severityOpt?.label.split(' / ')[0]}
              </Badge>
              <Badge variant="outline" className={`${statusOpt?.color} text-white border-0`}>
                {statusOpt?.label.split(' / ')[0]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{ncr.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {ncr.status !== 'closed' && ncr.status !== 'cancelled' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Close NCR
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close this NCR?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the NCR as closed and record you as the verifier.
                    Make sure all corrective actions have been completed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClose}>
                    Close NCR
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
              <Button onClick={handleSave} disabled={updateNCR.isPending}>
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
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{categoryOpt?.label.split(' / ')[0]}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium truncate">
                  {ncr.supplier?.supplier_name || 'N/A'}
                </p>
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
                  {ncr.assigned_to_profile?.display_name || 'Unassigned'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className={`font-medium ${ncr.due_date && new Date(ncr.due_date) < new Date() && ncr.status !== 'closed' ? 'text-red-500' : ''}`}>
                  {ncr.due_date ? format(new Date(ncr.due_date), 'MMM dd, yyyy') : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* NCR Details */}
          <Card>
            <CardHeader>
              <CardTitle>NCR Details / NCR详情</CardTitle>
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
                          {NCR_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select
                        value={editData.severity}
                        onValueChange={(v) => setEditData({ ...editData, severity: v })}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={editData.due_date}
                        onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                      />
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
                  <div className="space-y-2">
                    <Label>Root Cause / 根本原因</Label>
                    <Textarea
                      value={editData.root_cause}
                      onChange={(e) => setEditData({ ...editData, root_cause: e.target.value })}
                      rows={3}
                      placeholder="Analysis of why this issue occurred..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Corrective Action / 纠正措施</Label>
                    <Textarea
                      value={editData.corrective_action}
                      onChange={(e) => setEditData({ ...editData, corrective_action: e.target.value })}
                      rows={3}
                      placeholder="Actions taken to fix the immediate issue..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preventive Action / 预防措施</Label>
                    <Textarea
                      value={editData.preventive_action}
                      onChange={(e) => setEditData({ ...editData, preventive_action: e.target.value })}
                      rows={3}
                      placeholder="Actions to prevent recurrence..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Impact ($)</Label>
                    <Input
                      type="number"
                      value={editData.cost_impact}
                      onChange={(e) => setEditData({ ...editData, cost_impact: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Description / 描述</h4>
                    <p className="whitespace-pre-wrap">{ncr.description || 'No description provided'}</p>
                  </div>
                  {ncr.root_cause && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Root Cause / 根本原因</h4>
                        <p className="whitespace-pre-wrap">{ncr.root_cause}</p>
                      </div>
                    </>
                  )}
                  {ncr.corrective_action && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Corrective Action / 纠正措施</h4>
                        <p className="whitespace-pre-wrap">{ncr.corrective_action}</p>
                      </div>
                    </>
                  )}
                  {ncr.preventive_action && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Preventive Action / 预防措施</h4>
                        <p className="whitespace-pre-wrap">{ncr.preventive_action}</p>
                      </div>
                    </>
                  )}
                  {ncr.cost_impact > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Cost Impact</h4>
                        <p className="text-lg font-semibold text-red-500">
                          ${ncr.cost_impact.toLocaleString()} {ncr.cost_currency}
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Related Information */}
          <Card>
            <CardHeader>
              <CardTitle>Related Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Order</p>
                  {ncr.order ? (
                    <Badge
                      variant="outline"
                      className="font-mono cursor-pointer"
                      onClick={() => navigate(`/dashboard/orders/${ncr.order?.id}`)}
                    >
                      {ncr.order.order_number}
                    </Badge>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Order</p>
                  {ncr.purchase_order ? (
                    <Badge
                      variant="outline"
                      className="font-mono cursor-pointer"
                      onClick={() => navigate(`/dashboard/purchase-orders/${ncr.purchase_order?.id}`)}
                    >
                      {ncr.purchase_order.po_number}
                    </Badge>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">QC Inspection</p>
                  {ncr.qc_inspection ? (
                    <Badge
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => navigate(`/dashboard/qc/inspections/${ncr.qc_inspection?.id}`)}
                    >
                      View Inspection
                    </Badge>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Raised By</p>
                  <p className="font-medium">{ncr.raised_by_profile?.display_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p>{format(new Date(ncr.created_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                {ncr.closed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Closed</p>
                    <p>{format(new Date(ncr.closed_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                )}
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
