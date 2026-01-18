import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, MoreHorizontal, FolderKanban, ArrowRight, Link2, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TeamAssignmentCard } from '@/components/team/TeamAssignmentCard';

const PROJECT_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'sourcing', label: 'Sourcing', color: 'bg-yellow-500' },
  { value: 'quoted', label: 'Quoted', color: 'bg-purple-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

interface ProjectFormData {
  project_title: string;
  description: string;
  status: string;
  lead_id: string | null;
}

export default function Sourcing() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    project_title: '',
    description: '',
    status: 'new',
    lead_id: null,
  });
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch sourcing projects with related lead
  const { data: projects, isLoading } = useQuery({
    queryKey: ['sourcing-projects', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('sourcing_projects')
        .select(`
          *,
          lead:leads(id, company_name, contact_person),
          sourcing_items(id)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.ilike('project_title', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch leads for linking
  const { data: leads } = useQuery({
    queryKey: ['leads-for-sourcing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, company_name, contact_person')
        .order('company_name');
      if (error) throw error;
      return data;
    },
  });

  const createProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const { error } = await supabase.from('sourcing_projects').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-projects'] });
      toast.success('Sourcing project created');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...data }: ProjectFormData & { id: string }) => {
      const { error } = await supabase
        .from('sourcing_projects')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-projects'] });
      toast.success('Project updated');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      
      // Delete projects directly - items will be cascade deleted or handled by DB
      const { error } = await supabase
        .from('sourcing_projects')
        .delete()
        .in('id', ids as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-projects'] });
      toast.success(`${selectedIds.size} project(s) deleted`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to delete projects: ' + error.message);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProject(null);
    setFormData({
      project_title: '',
      description: '',
      status: 'new',
      lead_id: null,
    });
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setFormData({
      project_title: project.project_title,
      description: project.description || '',
      status: project.status,
      lead_id: project.lead_id,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, ...formData });
    } else {
      createProject.mutate(formData);
    }
  };

  const handleConvertToOrder = (project: any) => {
    navigate('/dashboard/orders/new', { 
      state: { 
        fromSourcing: project.id,
        leadId: project.lead_id 
      } 
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === projects?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects?.map(p => p.id) || []));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = PROJECT_STATUSES.find(s => s.value === status);
    return (
      <Badge variant="secondary" className={`${statusConfig?.color} text-white`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Sourcing Projects" 
        description="Manage product sourcing from leads to supplier quotes"
      >
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </PageHeader>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
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
                {PROJECT_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : projects?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sourcing projects found. Create your first project to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={projects?.length > 0 && selectedIds.size === projects.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Project Title</TableHead>
                    <TableHead>Linked Lead</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects?.map((project) => (
                    <TableRow 
                      key={project.id} 
                      className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => navigate(`/dashboard/sourcing/${project.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(project.id)}
                          onCheckedChange={() => toggleSelect(project.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{project.project_title}</div>
                          {project.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.lead ? (
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{project.lead.company_name}</div>
                              <div className="text-xs text-muted-foreground">{project.lead.contact_person}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TeamAssignmentCard 
                          entityType="sourcing_project" 
                          entityId={project.id} 
                          assignedTeam={(project as any).assigned_team}
                          compact
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{project.sourcing_items?.length || 0} items</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(project.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/sourcing/${project.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditProject(project)}>
                              Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/quotations/new?project=${project.id}`)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Create Quotation
                            </DropdownMenuItem>
                            {project.status === 'approved' && (
                              <DropdownMenuItem onClick={() => handleConvertToOrder(project)}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Convert to Order
                              </DropdownMenuItem>
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Create Sourcing Project'}</DialogTitle>
            <DialogDescription>
              {editingProject ? 'Update project details' : 'Create a new sourcing project, optionally linked to a lead'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project_title">Project Title *</Label>
              <Input
                id="project_title"
                value={formData.project_title}
                onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
                placeholder="Q1 Product Line Expansion"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_id">Link to Lead (optional)</Label>
              <Select 
                value={formData.lead_id || 'none'} 
                onValueChange={(value) => setFormData({ ...formData, lead_id: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked lead</SelectItem>
                  {leads?.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.company_name} - {lead.contact_person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project details and requirements..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.project_title}
            >
              {editingProject ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} project(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected sourcing projects and all their items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteMutation.mutate()}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
