import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type EntityType = 'order' | 'purchase_order' | 'sourcing';

export interface WorkflowStep {
  id: string;
  entity_type: string;
  step_key: string;
  step_name: string;
  step_name_cn: string | null;
  step_order: number;
  is_required: boolean | null;
  can_skip: boolean | null;
  auto_complete: boolean | null;
  blocked_by_steps: string[] | null;
  responsible_roles: string[] | null;
}

export interface WorkflowProgress {
  id: string;
  entity_id: string;
  entity_type: string;
  step_key: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  assigned_to: string[] | null;
}

export interface WorkflowStepWithProgress extends WorkflowStep {
  progress: WorkflowProgress | null;
  isBlocked: boolean;
  blockedBySteps: string[];
}

// Group steps by phase
export const WORKFLOW_PHASES = {
  marketing: { label: 'Marketing', labelCn: '市场', color: 'bg-purple-500' },
  sales: { label: 'Sales', labelCn: '销售', color: 'bg-blue-500' },
  sourcing: { label: 'Sourcing', labelCn: '采购', color: 'bg-cyan-500' },
  production: { label: 'Production', labelCn: '生产', color: 'bg-amber-500' },
  qc: { label: 'QC', labelCn: '质检', color: 'bg-orange-500' },
  logistics: { label: 'Logistics', labelCn: '物流', color: 'bg-green-500' },
  finance: { label: 'Finance', labelCn: '财务', color: 'bg-emerald-500' },
};

// Map step_key to phase
const STEP_PHASE_MAP: Record<string, keyof typeof WORKFLOW_PHASES> = {
  lead_created: 'marketing',
  lead_qualified: 'marketing',
  sourcing_started: 'sourcing',
  sourcing_completed: 'sourcing',
  quotation_sent: 'sales',
  quotation_approved: 'sales',
  order_confirmed: 'sales',
  customer_deposit_collected: 'finance',
  po_created: 'sourcing',
  po_signed: 'sourcing',
  factory_deposit_paid: 'finance',
  production_started: 'production',
  production_50: 'production',
  production_completed: 'production',
  qc_scheduled: 'qc',
  qc_completed: 'qc',
  customer_balance_collected: 'finance',
  factory_balance_paid: 'finance',
  shipment_created: 'logistics',
  shipped: 'logistics',
  delivered: 'logistics',
  invoice_sent: 'finance',
  order_closed: 'finance',
};

export function getStepPhase(stepKey: string): keyof typeof WORKFLOW_PHASES {
  return STEP_PHASE_MAP[stepKey] || 'sales';
}

export function useWorkflowSteps(entityType: EntityType) {
  return useQuery({
    queryKey: ['workflow-steps', entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('entity_type', entityType)
        .order('step_order');
      
      if (error) throw error;
      return data as WorkflowStep[];
    },
  });
}

export function useWorkflowProgress(entityType: EntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-progress', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from('workflow_progress')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      
      if (error) throw error;
      return data as WorkflowProgress[];
    },
    enabled: !!entityId,
  });
}

export function useWorkflow(entityType: EntityType, entityId: string | undefined) {
  const { data: steps } = useWorkflowSteps(entityType);
  const { data: progress, isLoading } = useWorkflowProgress(entityType, entityId);

  // Combine steps with progress and calculate blocking
  const stepsWithProgress: WorkflowStepWithProgress[] = (steps || []).map(step => {
    const stepProgress = progress?.find(p => p.step_key === step.step_key) || null;
    
    // Check if step is blocked
    const blockedBySteps: string[] = [];
    let isBlocked = false;
    
    if (step.blocked_by_steps && step.blocked_by_steps.length > 0) {
      for (const blockerKey of step.blocked_by_steps) {
        const blockerProgress = progress?.find(p => p.step_key === blockerKey);
        if (!blockerProgress || (blockerProgress.status !== 'completed' && blockerProgress.status !== 'skipped')) {
          isBlocked = true;
          const blockerStep = steps?.find(s => s.step_key === blockerKey);
          if (blockerStep) {
            blockedBySteps.push(blockerStep.step_name);
          }
        }
      }
    }

    return {
      ...step,
      progress: stepProgress,
      isBlocked,
      blockedBySteps,
    };
  });

  // Calculate completion stats
  const totalSteps = stepsWithProgress.length;
  const completedSteps = stepsWithProgress.filter(
    s => s.progress?.status === 'completed' || s.progress?.status === 'skipped'
  ).length;
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Get current step (first non-completed, non-blocked step)
  const currentStep = stepsWithProgress.find(
    s => !s.isBlocked && s.progress?.status !== 'completed' && s.progress?.status !== 'skipped'
  );

  return {
    steps: stepsWithProgress,
    totalSteps,
    completedSteps,
    progressPercentage,
    currentStep,
    isLoading,
  };
}

export function useCompleteWorkflowStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      stepKey,
      notes,
      skip = false,
    }: {
      entityType: EntityType;
      entityId: string;
      stepKey: string;
      notes?: string;
      skip?: boolean;
    }) => {
      // Check if progress exists
      const { data: existing } = await supabase
        .from('workflow_progress')
        .select('id')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('step_key', stepKey)
        .single();

      const progressData = {
        entity_type: entityType,
        entity_id: entityId,
        step_key: stepKey,
        status: skip ? 'skipped' : 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user?.id || null,
        notes: notes || null,
      };

      if (existing) {
        const { error } = await supabase
          .from('workflow_progress')
          .update(progressData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workflow_progress')
          .insert(progressData);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['workflow-progress', variables.entityType, variables.entityId] 
      });
      toast.success(variables.skip ? 'Step skipped' : 'Step completed');
    },
    onError: (error: any) => {
      toast.error('Failed to update step: ' + error.message);
    },
  });
}

export function useResetWorkflowStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      stepKey,
    }: {
      entityType: EntityType;
      entityId: string;
      stepKey: string;
    }) => {
      const { error } = await supabase
        .from('workflow_progress')
        .update({
          status: 'pending',
          completed_at: null,
          completed_by: null,
        })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('step_key', stepKey);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['workflow-progress', variables.entityType, variables.entityId] 
      });
      toast.success('Step reset');
    },
    onError: (error: any) => {
      toast.error('Failed to reset step: ' + error.message);
    },
  });
}
