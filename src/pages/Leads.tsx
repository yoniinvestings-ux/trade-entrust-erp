import { useState, useMemo } from 'react';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPipeline } from '@/components/ui/status-pipeline';
import { AdvancedFilters } from '@/components/ui/advanced-filters';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
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
} from '@/components/ui/alert-dialog';
import { 
  Plus, Search, MoreHorizontal, Mail, Phone, Building2, Sparkles, 
  UserCheck, FolderKanban, FileText, CheckCircle2, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay } from 'date-fns';
import { LeadConversionDialog } from '@/components/leads/LeadConversionDialog';

const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-yellow-500' },
  { value: 'won', label: 'Won', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
];

const LEAD_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

interface LeadFormData {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  score: number;
  notes: string;
}

export default function Leads() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<LeadFormData>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    source: 'website',
    status: 'new',
    score: 0,
    notes: '',
  });
  
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [selectedLeadForConversion, setSelectedLeadForConversion] = useState<any>(null);
  const [conversionType, setConversionType] = useState<'customer' | 'sourcing' | 'quotation' | null>(null);
  
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          converted_customer:customers!leads_converted_to_customer_id_fkey(id, company_name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    LEAD_STATUSES.forEach((s) => (counts[s.value] = 0));
    leads?.forEach((lead) => {
      if (counts[lead.status] !== undefined) {
        counts[lead.status]++;
      }
    });
    return counts;
  }, [leads]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;

      if (dateRange.from) {
        const leadDate = new Date(lead.created_at);
        if (leadDate < startOfDay(dateRange.from)) return false;
      }
      if (dateRange.to) {
        const leadDate = new Date(lead.created_at);
        if (leadDate > endOfDay(dateRange.to)) return false;
      }

      if (search) {
        const searchLower = search.toLowerCase();
        const matchesCompany = lead.company_name?.toLowerCase().includes(searchLower);
        const matchesContact = lead.contact_person?.toLowerCase().includes(searchLower);
        const matchesEmail = lead.email?.toLowerCase().includes(searchLower);
        const matchesPhone = lead.phone?.toLowerCase().includes(searchLower);
        const matchesNotes = lead.notes?.toLowerCase().includes(searchLower);
        if (!matchesCompany && !matchesContact && !matchesEmail && !matchesPhone && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [leads, statusFilter, search, dateRange]);

  const hasActiveFilters = dateRange.from || dateRange.to;

  const { data: linkedSourcingProjects } = useQuery({
    queryKey: ['linked-sourcing-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourcing_projects')
        .select('id, lead_id, project_title')
        .not('lead_id', 'is', null);
      if (error) throw error;
      return data;
    },
  });

  const { data: linkedQuotations } = useQuery({
    queryKey: ['linked-quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('id, lead_id, quotation_number')
        .not('lead_id', 'is', null);
      if (error) throw error;
      return data;
    },
  });

  const createLead = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const { error } = await supabase.from('leads').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to create lead: ' + error.message);
    },
  });

  const deleteLeads = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('leads').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Deleted ${selectedLeadIds.length} lead(s)`);
      setSelectedLeadIds([]);
      setBulkDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to delete lead(s): ' + error.message);
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...data }: LeadFormData & { id: string }) => {
      const { error } = await supabase.from('leads').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead updated successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to update lead: ' + error.message);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLead(null);
    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      source: 'website',
      status: 'new',
      score: 0,
      notes: '',
    });
  };

  const handleEditLead = (lead: any) => {
    setEditingLead(lead);
    setFormData({
      company_name: lead.company_name,
      contact_person: lead.contact_person,
      email: lead.email,
      phone: lead.phone || '',
      source: lead.source,
      status: lead.status,
      score: lead.score || 0,
      notes: lead.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingLead) {
      updateLead.mutate({ id: editingLead.id, ...formData });
    } else {
      createLead.mutate(formData);
    }
  };

  const handleConversion = (lead: any, type: 'customer' | 'sourcing' | 'quotation') => {
    setSelectedLeadForConversion(lead);
    setConversionType(type);
    setConversionDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = LEAD_STATUSES.find(s => s.value === status);
    return (
      <Badge variant="secondary" className={`${statusConfig?.color} text-white`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  const getLeadLinks = (leadId: string) => {
    const sourcingProject = linkedSourcingProjects?.find(p => p.lead_id === leadId);
    const quotation = linkedQuotations?.find(q => q.lead_id === leadId);
    return { sourcingProject, quotation };
  };

  const clearFilters = () => {
    setDateRange({});
    setSearch('');
    setStatusFilter('all');
  };

  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    deleteLeads.mutate(selectedLeadIds);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Leads" 
        description="Manage your sales pipeline and track potential customers"
      >
        <div className="flex gap-2">
          {selectedLeadIds.length > 0 && (
            <Button variant="destructive" onClick={() => setBulkDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedLeadIds.length})
            </Button>
          )}
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </div>
      </PageHeader>

      {/* Status Pipeline */}
      <StatusPipeline
        statuses={LEAD_STATUSES}
        counts={statusCounts}
        activeStatus={statusFilter}
        onStatusChange={setStatusFilter}
        allLabel="All Leads"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, email, phone, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <AdvancedFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              showTeamFilter={false}
              hasActiveFilters={!!hasActiveFilters}
              onClearFilters={clearFilters}
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLeads?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leads found. Create your first lead to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          filteredLeads?.length
                            ? filteredLeads.every((l) => selectedLeadIds.includes(l.id))
                            : false
                        }
                        onCheckedChange={(checked) => {
                          if (!filteredLeads) return;
                          const visibleIds = filteredLeads.map((l) => l.id);
                          if (checked) {
                            setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
                          } else {
                            setSelectedLeadIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Links</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads?.map((lead) => {
                    const links = getLeadLinks(lead.id);
                    const isConverted = !!lead.converted_to_customer_id;
                    
                    return (
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedLeadIds.includes(lead.id)}
                            onCheckedChange={() => {
                              setSelectedLeadIds((prev) =>
                                prev.includes(lead.id)
                                  ? prev.filter((id) => id !== lead.id)
                                  : [...prev, lead.id]
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{lead.company_name}</div>
                            {isConverted && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{lead.contact_person}</div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                              {lead.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {lead.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {LEAD_SOURCES.find(s => s.value === lead.source)?.label || lead.source}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(lead.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {links.sourcingProject && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <FolderKanban className="h-3 w-3" />
                                Sourcing
                              </Badge>
                            )}
                            {links.quotation && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <FileText className="h-3 w-3" />
                                Quote
                              </Badge>
                            )}
                            {!links.sourcingProject && !links.quotation && !isConverted && (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 font-semibold ${getScoreColor(lead.score || 0)}`}>
                            <Sparkles className="h-4 w-4" />
                            {lead.score || 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(lead.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                                Edit Lead
                              </DropdownMenuItem>
                              
                              {lead.status !== 'won' && lead.status !== 'lost' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleConversion(lead, 'sourcing')}
                                    className="gap-2"
                                  >
                                    <FolderKanban className="h-4 w-4" />
                                    Start Sourcing Project
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleConversion(lead, 'quotation')}
                                    className="gap-2"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Create Quotation
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleConversion(lead, 'customer')}
                                    className="gap-2 text-green-600"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    Convert to Customer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Lead Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Edit Lead' : 'Create New Lead'}</DialogTitle>
            <DialogDescription>
              {editingLead ? 'Update lead information' : 'Add a new lead to your pipeline'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@acme.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1-555-0100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(source => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="score">Lead Score (0-100)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes about this lead..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.company_name || !formData.contact_person || !formData.email}>
              {editingLead ? 'Update Lead' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedLeadIds.length} Leads</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedLeadIds.length} lead(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conversion Dialog */}
      {selectedLeadForConversion && conversionType && (
        <LeadConversionDialog
          open={conversionDialogOpen}
          onOpenChange={setConversionDialogOpen}
          lead={selectedLeadForConversion}
          type={conversionType}
        />
      )}
    </div>
  );
}
