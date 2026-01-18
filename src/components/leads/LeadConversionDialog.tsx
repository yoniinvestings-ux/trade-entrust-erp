import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building2, FolderKanban, FileText, CheckCircle } from 'lucide-react';

interface Lead {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string | null;
  status: string;
}

interface LeadConversionDialogProps {
  lead: Lead | null;
  type: 'customer' | 'sourcing' | 'quotation' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadConversionDialog({ lead, type, open, onOpenChange }: LeadConversionDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const convertToCustomer = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error('No lead selected');
      
      // Create customer from lead
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          company_name: lead.company_name,
          contact_person: lead.contact_person,
          email: lead.email,
          phone: lead.phone,
          status: 'active',
        })
        .select()
        .single();
      
      if (customerError) throw customerError;
      
      // Update lead with conversion info
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          status: 'won',
          converted_to_customer_id: customer.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
      
      if (leadError) throw leadError;
      
      return customer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Lead converted to customer successfully');
      onOpenChange(false);
      navigate(`/dashboard/customers`);
    },
    onError: (error) => {
      toast.error('Failed to convert lead: ' + error.message);
    },
  });

  const createSourcingProject = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error('No lead selected');
      
      const title = projectTitle || `Sourcing for ${lead.company_name}`;
      
      // Create sourcing project linked to lead
      const { data: project, error: projectError } = await supabase
        .from('sourcing_projects')
        .insert({
          project_title: title,
          description: projectDescription,
          lead_id: lead.id,
          status: 'new',
        })
        .select()
        .single();
      
      if (projectError) throw projectError;
      
      // Update lead status to qualified
      if (lead.status === 'new') {
        await supabase
          .from('leads')
          .update({ status: 'qualified' })
          .eq('id', lead.id);
      }
      
      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['sourcing-projects'] });
      toast.success('Sourcing project created successfully');
      onOpenChange(false);
      setProjectTitle('');
      setProjectDescription('');
      navigate(`/dashboard/sourcing/${project.id}`);
    },
    onError: (error) => {
      toast.error('Failed to create sourcing project: ' + error.message);
    },
  });

  const handleSubmit = () => {
    if (type === 'customer') {
      convertToCustomer.mutate();
    } else if (type === 'sourcing') {
      createSourcingProject.mutate();
    } else if (type === 'quotation') {
      // Navigate to quotation form with lead pre-selected
      onOpenChange(false);
      navigate(`/dashboard/quotations/new?lead=${lead?.id}`);
    }
  };

  const isLoading = convertToCustomer.isPending || createSourcingProject.isPending;

  const getDialogContent = () => {
    switch (type) {
      case 'customer':
        return {
          title: 'Convert Lead to Customer',
          description: 'This will create a new customer record from this lead and mark the lead as won.',
          icon: Building2,
          iconColor: 'text-green-500',
          buttonText: 'Convert to Customer',
          showForm: false,
        };
      case 'sourcing':
        return {
          title: 'Start Sourcing Project',
          description: 'Create a new sourcing project linked to this lead.',
          icon: FolderKanban,
          iconColor: 'text-blue-500',
          buttonText: 'Create Project',
          showForm: true,
        };
      case 'quotation':
        return {
          title: 'Create Quotation',
          description: 'Create a new quotation for this lead.',
          icon: FileText,
          iconColor: 'text-purple-500',
          buttonText: 'Create Quotation',
          showForm: false,
        };
      default:
        return null;
    }
  };

  const content = getDialogContent();
  if (!content || !lead) return null;

  const Icon = content.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${content.iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{content.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {content.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Lead Info Preview */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Company</span>
              <span className="font-medium">{lead.company_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contact</span>
              <span className="text-sm">{lead.contact_person}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm">{lead.email}</span>
            </div>
            {lead.phone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm">{lead.phone}</span>
              </div>
            )}
          </div>

          {/* Sourcing Project Form */}
          {content.showForm && type === 'sourcing' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_title">Project Title</Label>
                <Input
                  id="project_title"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder={`Sourcing for ${lead.company_name}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_description">Description (optional)</Label>
                <Textarea
                  id="project_description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Project requirements and notes..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Confirmation for customer conversion */}
          {type === 'customer' && (
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-700 dark:text-green-400">Ready to convert</p>
                <p className="text-green-600 dark:text-green-500 mt-1">
                  Lead status will be updated to "Won" and a new customer record will be created.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Processing...' : content.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
