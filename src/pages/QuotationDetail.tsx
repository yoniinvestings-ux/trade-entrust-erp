import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { 
  ArrowLeft, Edit, FileText, Printer, ChevronDown, Send, 
  CheckCircle, XCircle, ShoppingCart, Calendar, Building2, Clock,
  ImageIcon, Factory, ClipboardCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { QuotationTemplate } from '@/components/documents/QuotationTemplate';
import { TeamAssignmentCard } from '@/components/team/TeamAssignmentCard';
import { EntityUpdatesPanel } from '@/components/updates/EntityUpdatesPanel';
import { toast } from 'sonner';
import { generateDocumentFilename } from '@/lib/documentFilename';

const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-500' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'expired', label: 'Expired', color: 'bg-orange-500' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-500' },
];

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: companySettings } = useCompanySettings();
  
  const [showQuotationPreview, setShowQuotationPreview] = useState(false);
  const [showFactoryAuditDialog, setShowFactoryAuditDialog] = useState(false);
  const [auditSupplier, setAuditSupplier] = useState<string>('');
  const [auditDate, setAuditDate] = useState<string>('');

  // Fetch quotation with related data
  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          lead:leads(id, company_name, contact_person, email, phone),
          customer:customers(id, company_name, contact_person, email, phone),
          sourcing_project:sourcing_projects(id, project_title),
          quotation_items(id, product_name, model_number, specifications, quantity, unit_price, lead_time_days, remarks, sourcing_item_id, supplier_id, photos)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;

      // Parse photos JSONB for each item, or fetch from product_photos if needed
      if (data?.quotation_items) {
        data.quotation_items = await Promise.all(data.quotation_items.map(async (item: any) => {
          // Check if photos are in the JSONB field
          let photos = [];
          if (item.photos) {
            try {
              photos = typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos;
            } catch {
              photos = [];
            }
          }
          
          // Fallback to product_photos table via sourcing_item_id
          if (photos.length === 0 && item.sourcing_item_id) {
            const { data: photosData } = await supabase
              .from('product_photos')
              .select('*')
              .eq('sourcing_item_id', item.sourcing_item_id);
            photos = photosData || [];
          }
          
          return { ...item, photos };
        }));
      }

      return data;
    },
    enabled: !!id,
  });

  // Fetch linked QC inspections (factory audits)
  const { data: factoryAudits } = useQuery({
    queryKey: ['factory-audits', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qc_inspections')
        .select('*, purchase_order:purchase_orders(supplier:suppliers(supplier_name))')
        .eq('quotation_id', id)
        .eq('inspection_type', 'factory_audit');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch suppliers for factory audit selection
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, supplier_name')
        .order('supplier_name');
      if (error) throw error;
      return data;
    },
  });

  // Create factory audit mutation
  const createFactoryAudit = useMutation({
    mutationFn: async () => {
      if (!auditSupplier || !auditDate) {
        throw new Error('Please select supplier and date');
      }

      const { error } = await supabase
        .from('qc_inspections')
        .insert({
          order_id: quotation?.sourcing_project?.id ? null : quotation?.id, // Placeholder
          quotation_id: id,
          inspection_type: 'factory_audit',
          scheduled_date: auditDate,
          status: 'pending',
          inspector: null,
          location: 'Factory',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory-audits', id] });
      toast.success('Factory audit requested');
      setShowFactoryAuditDialog(false);
      setAuditSupplier('');
      setAuditDate('');
    },
    onError: (error) => toast.error('Failed to request audit: ' + error.message),
  });

  // Update quotation status mutation
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from('quotations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Status updated');
    },
    onError: (error) => toast.error('Failed to update status: ' + error.message),
  });

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

  const getCustomerOrLeadData = () => {
    if (quotation?.customer) {
      return {
        company_name: quotation.customer.company_name,
        contact_person: quotation.customer.contact_person,
        email: quotation.customer.email,
        phone: quotation.customer.phone,
      };
    }
    if (quotation?.lead) {
      return {
        company_name: quotation.lead.company_name,
        contact_person: quotation.lead.contact_person,
        email: quotation.lead.email,
        phone: quotation.lead.phone,
      };
    }
    return {
      company_name: 'Unknown',
      contact_person: '-',
      email: '-',
      phone: null,
    };
  };

  const handleGenerateQuotation = () => {
    if (!companySettings) {
      toast.error('Please configure company settings first');
      return;
    }
    setShowQuotationPreview(true);
  };

  const handleConvertToOrder = () => {
    navigate('/dashboard/orders/new', { 
      state: { 
        fromQuotation: id,
        customerId: quotation?.customer_id,
        leadId: quotation?.lead_id,
        quotationItems: quotation?.quotation_items,
        tradeTerm: quotation?.trade_term,
        currency: quotation?.currency,
        sourcingProjectId: quotation?.sourcing_project_id,
      } 
    });
  };

  // Check if all factory audits are passed
  const allAuditsPassed = factoryAudits && factoryAudits.length > 0 && 
    factoryAudits.every(audit => audit.conclusion === 'accepted');
  
  const canConvertToOrder = quotation?.status === 'accepted' && 
    (factoryAudits?.length === 0 || allAuditsPassed);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Quotation not found</p>
        <Button variant="link" onClick={() => navigate('/dashboard/quotations')}>
          Back to Quotations
        </Button>
      </div>
    );
  }

  const customerOrLead = getCustomerOrLeadData();
  const totalValue = quotation.quotation_items?.reduce(
    (sum: number, item: any) => sum + (item.quantity * item.unit_price), 0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/quotations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title={quotation.quotation_number}
          description={`Quotation for ${customerOrLead.company_name}`}
        >
          <div className="flex gap-2 flex-wrap">
            {/* Status Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {getStatusBadge(quotation.status)}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {quotation.status === 'draft' && (
                  <DropdownMenuItem onClick={() => updateStatus.mutate('sent')}>
                    <Send className="mr-2 h-4 w-4" />
                    Mark as Sent
                  </DropdownMenuItem>
                )}
                {quotation.status === 'sent' && (
                  <>
                    <DropdownMenuItem onClick={() => updateStatus.mutate('accepted')}>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Mark as Accepted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateStatus.mutate('rejected')}>
                      <XCircle className="mr-2 h-4 w-4 text-red-500" />
                      Mark as Rejected
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Generate Document
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleGenerateQuotation}>
                  <FileText className="mr-2 h-4 w-4" />
                  Quotation PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Factory Audit Button */}
            {(quotation.status === 'sent' || quotation.status === 'accepted') && (
              <Button variant="outline" onClick={() => setShowFactoryAuditDialog(true)}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Request Factory Audit
              </Button>
            )}

            {/* Convert to Order Button */}
            {canConvertToOrder && (
              <Button onClick={handleConvertToOrder}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Convert to Order
              </Button>
            )}

            <Button variant="outline" onClick={() => navigate(`/dashboard/quotations/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* Summary Cards - Including Team Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <TeamAssignmentCard 
          entityType="quotation" 
          entityId={id!} 
          assignedTeam={(quotation as any).assigned_team} 
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Customer/Lead</p>
                <p className="font-semibold truncate">{customerOrLead.company_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10 text-blue-500 p-2 bg-blue-500/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Items</p>
                <p className="text-2xl font-bold">{quotation.quotation_items?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-10 w-10 text-orange-500 p-2 bg-orange-500/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Valid Until</p>
                <p className="font-semibold">
                  {quotation.valid_until 
                    ? format(new Date(quotation.valid_until), 'MMM d, yyyy')
                    : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-10 w-10 text-green-500 p-2 bg-green-500/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {getStatusBadge(quotation.status)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Factory Audit Status */}
      {factoryAudits && factoryAudits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Factory Audits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {factoryAudits.map((audit: any) => (
                <div key={audit.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Factory Audit</p>
                      <p className="text-sm text-muted-foreground">
                        {audit.scheduled_date ? format(new Date(audit.scheduled_date), 'MMM d, yyyy') : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={
                    audit.conclusion === 'accepted' ? 'bg-green-500 text-white' :
                    audit.conclusion === 'rejected' ? 'bg-red-500 text-white' :
                    audit.status === 'in_progress' ? 'bg-blue-500 text-white' :
                    'bg-gray-500 text-white'
                  }>
                    {audit.conclusion || audit.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quotation Items */}
          <Card>
            <CardHeader>
              <CardTitle>Quotation Items</CardTitle>
            </CardHeader>
            <CardContent>
              {quotation.quotation_items?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No items in this quotation</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Model #</TableHead>
                      <TableHead className="w-40">Product Name</TableHead>
                      <TableHead className="w-16">Photo</TableHead>
                      <TableHead>Specifications</TableHead>
                      <TableHead className="text-center w-16">Qty</TableHead>
                      <TableHead className="text-right w-24">Unit Price</TableHead>
                      <TableHead className="text-right w-24">Total</TableHead>
                      <TableHead className="text-center w-24">Lead/Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotation.quotation_items?.map((item: any) => {
                      const mainPhoto = item.photos?.find((p: any) => p.is_main) || item.photos?.[0];
                      const photoCount = item.photos?.length || 0;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{item.model_number || '-'}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{item.product_name}</p>
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              {mainPhoto ? (
                                <img 
                                  src={mainPhoto.url} 
                                  alt={item.product_name}
                                  className="w-12 h-12 object-cover rounded-md border"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              {photoCount > 1 && (
                                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                  {photoCount}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.specifications || '-'}</p>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price, quotation.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.quantity * item.unit_price, quotation.currency)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div>
                              {item.lead_time_days && <p className="text-sm">{item.lead_time_days} days</p>}
                              {item.remarks && <p className="text-xs text-muted-foreground line-clamp-1">{item.remarks}</p>}
                              {!item.lead_time_days && !item.remarks && '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Separator className="my-4" />
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalValue, quotation.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {quotation.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground">{quotation.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Quotation Info */}
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Quotation Number</p>
                <p className="font-mono font-medium">{quotation.quotation_number}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{format(new Date(quotation.created_at), 'MMM d, yyyy')}</p>
              </div>
              {quotation.sent_at && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Sent</p>
                    <p>{format(new Date(quotation.sent_at), 'MMM d, yyyy')}</p>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Currency</p>
                <p>{quotation.currency || 'USD'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Trade Term</p>
                <p>{quotation.trade_term || 'FOB'}</p>
              </div>
              {quotation.sourcing_project && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Sourcing Project</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto"
                      onClick={() => navigate(`/dashboard/sourcing/${quotation.sourcing_project.id}`)}
                    >
                      {quotation.sourcing_project.project_title}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer/Lead Info */}
          <Card>
            <CardHeader>
              <CardTitle>{quotation.customer ? 'Customer' : 'Lead'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{customerOrLead.company_name}</p>
                <p className="text-sm text-muted-foreground">{customerOrLead.contact_person}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm">{customerOrLead.email}</p>
              </div>
              {customerOrLead.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-sm">{customerOrLead.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Factory Audit Dialog */}
      <Dialog open={showFactoryAuditDialog} onOpenChange={setShowFactoryAuditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Factory Audit</DialogTitle>
            <DialogDescription>
              Schedule a QC factory audit to verify supplier capability before converting to order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Factory / Supplier</Label>
              <Select value={auditSupplier} onValueChange={setAuditSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier to audit" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input 
                type="date" 
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFactoryAuditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => createFactoryAudit.mutate()} disabled={createFactoryAudit.isPending}>
              {createFactoryAudit.isPending ? 'Requesting...' : 'Request Audit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      {companySettings && quotation && (
        <DocumentPreviewDialog
          open={showQuotationPreview}
          onOpenChange={setShowQuotationPreview}
          title="Quotation Preview"
          filename={generateDocumentFilename('QUOTATION', {
            quotationNumber: quotation.quotation_number,
            projectTitle: quotation.sourcing_project?.project_title,
          })}
        >
          <QuotationTemplate
            company={companySettings}
            customerOrLead={customerOrLead}
            quotation={{
              quotation_number: quotation.quotation_number,
              created_at: quotation.created_at,
              currency: quotation.currency,
              trade_term: quotation.trade_term,
              valid_until: quotation.valid_until,
              notes: quotation.notes,
              total_value: totalValue,
            }}
            items={quotation.quotation_items?.map((item: any) => ({
              id: item.id,
              product_name: item.product_name,
              model_number: item.model_number,
              specifications: item.specifications,
              quantity: item.quantity,
              unit_price: item.unit_price,
              lead_time_days: item.lead_time_days,
              remarks: item.remarks,
              photos: item.photos || [],
            })) || []}
            documentNumber={quotation.quotation_number}
          />
        </DocumentPreviewDialog>
      )}

      {/* Updates Panel */}
      <EntityUpdatesPanel 
        entityType="quotation" 
        entityId={id!}
        title="Quotation Updates"
        description="Team communication and notes for this quotation"
      />
    </div>
  );
}