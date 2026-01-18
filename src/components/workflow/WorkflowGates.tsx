import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  useWorkflow, 
  EntityType, 
  WorkflowStepWithProgress,
  WORKFLOW_PHASES,
  getStepPhase
} from '@/hooks/useWorkflow';
import { useTeamMembersById } from '@/hooks/useTeamMembers';
import { WorkflowStepDialog } from './WorkflowStepDialog';
import { 
  CheckCircle2, 
  Clock, 
  Lock, 
  SkipForward, 
  ChevronDown,
  ChevronRight,
  Circle,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface WorkflowGatesProps {
  entityType: EntityType;
  entityId: string;
}

function StepIcon({ step }: { step: WorkflowStepWithProgress }) {
  const status = step.progress?.status;
  
  if (step.isBlocked) {
    return <Lock className="h-4 w-4 text-red-500" />;
  }
  if (status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (status === 'skipped') {
    return <SkipForward className="h-4 w-4 text-amber-500" />;
  }
  if (status === 'in_progress') {
    return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function StepItem({ 
  step, 
  onClick,
  completedByMember,
}: { 
  step: WorkflowStepWithProgress; 
  onClick: () => void;
  completedByMember?: { display_name: string } | null;
}) {
  const status = step.progress?.status;
  const isCompleted = status === 'completed';
  const isSkipped = status === 'skipped';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
              'hover:bg-muted/80',
              step.isBlocked && 'opacity-50',
              isCompleted && 'bg-emerald-50 dark:bg-emerald-950/20',
              isSkipped && 'bg-amber-50 dark:bg-amber-950/20'
            )}
          >
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              isCompleted && 'bg-emerald-100 dark:bg-emerald-900/50',
              isSkipped && 'bg-amber-100 dark:bg-amber-900/50',
              step.isBlocked && 'bg-red-100 dark:bg-red-900/50',
              !isCompleted && !isSkipped && !step.isBlocked && 'bg-muted'
            )}>
              <StepIcon step={step} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                (isCompleted || isSkipped) && 'line-through text-muted-foreground'
              )}>
                {step.step_name}
              </p>
              {step.step_name_cn && (
                <p className="text-xs text-muted-foreground truncate">
                  {step.step_name_cn}
                </p>
              )}
            </div>

            {(isCompleted || isSkipped) && step.progress?.completed_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {completedByMember && (
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px] bg-primary/10">
                      {completedByMember.display_name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span>{format(new Date(step.progress.completed_at), 'MM/dd')}</span>
              </div>
            )}

            {!isCompleted && !isSkipped && step.is_required && (
              <Badge variant="outline" className="text-xs">Required</Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          {step.isBlocked ? (
            <p className="text-sm">
              Blocked by: {step.blockedBySteps.join(', ')}
            </p>
          ) : (
            <p className="text-sm">Click to {isCompleted || isSkipped ? 'view details' : 'complete'}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PhaseSection({
  phaseKey,
  steps,
  onStepClick,
  completedByMap,
}: {
  phaseKey: keyof typeof WORKFLOW_PHASES;
  steps: WorkflowStepWithProgress[];
  onStepClick: (step: WorkflowStepWithProgress) => void;
  completedByMap: Record<string, { display_name: string }>;
}) {
  const phase = WORKFLOW_PHASES[phaseKey];
  const [isOpen, setIsOpen] = useState(true);
  
  const completedCount = steps.filter(
    s => s.progress?.status === 'completed' || s.progress?.status === 'skipped'
  ).length;
  const allComplete = completedCount === steps.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          'flex items-center justify-between p-3 rounded-lg transition-colors',
          'hover:bg-muted/50',
          allComplete && 'bg-emerald-50 dark:bg-emerald-950/20'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('w-3 h-3 rounded-full', phase.color)} />
            <span className="font-medium">
              {phase.label}
              <span className="text-muted-foreground font-normal ml-2">
                / {phase.labelCn}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{steps.length}
            </Badge>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 border-l-2 border-muted pl-4 space-y-1 mt-2">
          {steps.map((step) => (
            <StepItem 
              key={step.id} 
              step={step} 
              onClick={() => onStepClick(step)}
              completedByMember={step.progress?.completed_by ? completedByMap[step.progress.completed_by] : null}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WorkflowGates({ entityType, entityId }: WorkflowGatesProps) {
  const { steps, totalSteps, completedSteps, progressPercentage, currentStep, isLoading } = useWorkflow(entityType, entityId);
  const [selectedStep, setSelectedStep] = useState<WorkflowStepWithProgress | null>(null);

  // Get all completed_by user IDs
  const completedByIds = steps
    .filter((s) => s.progress?.completed_by)
    .map(s => s.progress!.completed_by!);
  const { data: completedByMembers } = useTeamMembersById([...new Set(completedByIds)]);
  
  // Create a map for quick lookup
  const completedByMap: Record<string, { display_name: string }> = {};
  completedByMembers?.forEach(member => {
    completedByMap[member.user_id] = member;
  });

  // Group steps by phase
  const stepsByPhase = steps.reduce((acc, step) => {
    const phase = getStepPhase(step.step_key);
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(step);
    return acc;
  }, {} as Record<keyof typeof WORKFLOW_PHASES, WorkflowStepWithProgress[]>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-2 bg-muted rounded" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalSteps === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
          <CardDescription>No workflow steps defined for this entity type.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workflow Progress</CardTitle>
              <CardDescription>
                {completedSteps} of {totalSteps} steps completed
                {currentStep && !currentStep.isBlocked && (
                  <span className="ml-2">
                    • Current: <span className="font-medium text-foreground">{currentStep.step_name}</span>
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{progressPercentage}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2 mt-4" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(WORKFLOW_PHASES).map(([key, _]) => {
            const phaseSteps = stepsByPhase[key as keyof typeof WORKFLOW_PHASES];
            if (!phaseSteps || phaseSteps.length === 0) return null;
            
            return (
              <PhaseSection
                key={key}
                phaseKey={key as keyof typeof WORKFLOW_PHASES}
                steps={phaseSteps}
                onStepClick={setSelectedStep}
                completedByMap={completedByMap}
              />
            );
          })}
        </CardContent>
      </Card>

      <WorkflowStepDialog
        open={!!selectedStep}
        onOpenChange={(open) => !open && setSelectedStep(null)}
        step={selectedStep}
        entityType={entityType}
        entityId={entityId}
      />
    </>
  );
}
