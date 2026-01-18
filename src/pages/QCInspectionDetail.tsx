import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Printer, FileText, ClipboardCheck, Calendar, Building2, ExternalLink, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
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
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  useQCInspection, 
  useUpdateQCInspection,
  INSPECTION_TYPES,
  CONCLUSION_OPTIONS,
  QC_RESULT_OPTIONS,
} from '@/hooks/useQCInspections';
import { QCInspectionItemForm } from '@/components/qc/QCInspectionItemForm';
import { QCReportTemplate } from '@/components/qc/QCReportTemplate';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { useCreateDocument, generateDocumentNumber } from '@/hooks/useDocuments';

export default function QCInspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: inspection, isLoading } = useQCInspection(id);
  const updateInspection = useUpdateQCInspection();
  const createDocument = useCreateDocument();

  const [showReport, setShowReport] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    conclusion: '',
    defect_rate: 0,
    total_inspected: 0,
    total_defects: 0,
    critical_defects: 0,
    major_defects: 0,
    minor_defects: 0,
    report: '',
  });

  const startEdit = () => {
    if (!inspection) return;
    setEditData({
      status: inspection.status,
      conclusion: (inspection as any).conclusion || '',
      defect_rate: inspection.defect_rate || 0,
      total_inspected: (inspection as any).total_inspected || 0,
      total_defects: (inspection as any).total_defects || 0,
      critical_defects: (inspection as any).critical_defects || 0,
      major_defects: (inspection as any).major_defects || 0,
      minor_defects: (inspection as any).minor_defects || 0,
      report: inspection.report || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!inspection) return;
    try {
      await updateInspection.mutateAsync({
        id: inspection.id,
        ...editData,
      });
      setIsEditing(false);
      toast.success('Inspection updated / 检验已更新');
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleSaveReport = async () => {
    if (!inspection) return;
    
    const documentNumber = generateDocumentNumber('QC', inspection.order?.order_number || 'UNKNOWN');
    
    try {
      await createDocument.mutateAsync({
        document_type: 'QC_REPORT',
        document_number: documentNumber,
        order_id: inspection.order_id,
        purchase_order_id: inspection.po_id || undefined,
        metadata: {
          inspection_id: inspection.id,
          conclusion: (inspection as any).conclusion,
          defect_rate: inspection.defect_rate,
          generated_at: new Date().toISOString(),
        },
      });
      
      await updateInspection.mutateAsync({
        id: inspection.id,
        report_generated_at: new Date().toISOString(),
        customer_visible: true,
      } as any);
      
      toast.success('QC Report saved / QC报告已保存');
      setShowReport(false);
    } catch (error: any) {
      toast.error('Failed to save report: ' + error.message);
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

  if (!inspection) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Inspection not found</h2>
        <Button variant="link" onClick={() => navigate('/dashboard/qc-inspections')}>
          Back to QC Inspections
        </Button>
      </div>
    );
  }

  const items = inspection.inspection_items || [];
  const passCount = items.filter(i => i.result === 'pass').length;
  const issueCount = items.filter(i => i.result !== 'pass' && i.result !== 'pending').length;
  const inspectionType = INSPECTION_TYPES.find(t => t.value === (inspection as any).inspection_type);
  const conclusion = CONCLUSION_OPTIONS.find(c => c.value === (inspection as any).conclusion);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/qc-inspections')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">QC Inspection</h1>
              <StatusBadge status={inspection.status} />
              {conclusion && (
                <Badge className={`${conclusion.color} text-white`}>
                  {conclusion.label}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {inspectionType?.label} • {format(new Date(inspection.inspection_date), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowReport(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Generate Report / 生成报告
          </Button>
          {!isEditing ? (
            <Button variant="outline" onClick={startEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={updateInspection.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order</p>
                <Badge 
                  variant="outline" 
                  className="font-mono cursor-pointer"
                  onClick={() => navigate(`/dashboard/orders/${inspection.order_id}`)}
                >
                  {inspection.order?.order_number}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Badge>
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
                  {inspection.purchase_order?.supplier?.supplier_name || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Checks Passed</p>
                <p className="text-xl font-bold text-green-600">{passCount}/{items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issues Found</p>
                <p className="text-xl font-bold text-red-600">{issueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Defect Rate</p>
                <p className={`text-xl font-bold ${
                  (inspection.defect_rate || 0) <= 2 ? 'text-green-600' :
                  (inspection.defect_rate || 0) <= 5 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {(inspection.defect_rate || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspection Details */}
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Inspection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Conclusion / 结论</Label>
                <Select value={editData.conclusion} onValueChange={(v) => setEditData({ ...editData, conclusion: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select conclusion" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCLUSION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Defect Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={editData.defect_rate}
                  onChange={(e) => setEditData({ ...editData, defect_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Total Inspected</Label>
                <Input
                  type="number"
                  value={editData.total_inspected}
                  onChange={(e) => setEditData({ ...editData, total_inspected: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Critical Defects</Label>
                <Input
                  type="number"
                  value={editData.critical_defects}
                  onChange={(e) => setEditData({ ...editData, critical_defects: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Major Defects</Label>
                <Input
                  type="number"
                  value={editData.major_defects}
                  onChange={(e) => setEditData({ ...editData, major_defects: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Minor Defects</Label>
                <Input
                  type="number"
                  value={editData.minor_defects}
                  onChange={(e) => setEditData({ ...editData, minor_defects: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes / 备注</Label>
              <Textarea
                value={editData.report}
                onChange={(e) => setEditData({ ...editData, report: e.target.value })}
                rows={4}
                placeholder="Inspection notes and observations..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateInspection.isPending}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Inspection Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{inspection.order?.customer?.company_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AQL Level</p>
                <p className="font-medium">{(inspection as any).aql_level || 'S4'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sample Size</p>
                <p className="font-medium">{(inspection as any).sample_size || '-'} pcs</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{(inspection as any).location || '-'}</p>
              </div>
            </div>
            {inspection.report && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="whitespace-pre-wrap">{inspection.report}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inspection Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Checklist / 检验清单</CardTitle>
          <CardDescription>
            Complete the inspection checklist and record findings for any issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QCInspectionItemForm 
            inspectionId={inspection.id}
            items={items}
          />
        </CardContent>
      </Card>

      {/* Report Preview Dialog */}
      <DocumentPreviewDialog
        open={showReport}
        onOpenChange={setShowReport}
        title="QC Inspection Report / QC检验报告"
        onSave={handleSaveReport}
        filename={`QC-Report-${inspection.order?.order_number || 'unknown'}-${format(new Date(inspection.inspection_date), 'yyyyMMdd')}`}
      >
        <QCReportTemplate inspection={inspection} />
      </DocumentPreviewDialog>
    </div>
  );
}
