import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  useCompleteWorkflowStep, 
  useResetWorkflowStep, 
  WorkflowStepWithProgress, 
  EntityType,
  WORKFLOW_PHASES,
  getStepPhase 
} from '@/hooks/useWorkflow';
import { useTeamMembersById } from '@/hooks/useTeamMembers';
import { 
  CheckCircle2, 
  Clock, 
  SkipForward, 
  Lock, 
  RotateCcw,
  AlertTriangle,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface WorkflowStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: WorkflowStepWithProgress | null;
  entityType: EntityType;
  entityId: string;
}

export function WorkflowStepDialog({
  open,
  onOpenChange,
  step,
  entityType,
  entityId,
}: WorkflowStepDialogProps) {
  const [notes, setNotes] = useState('');
  const completeStep = useCompleteWorkflowStep();
  const resetStep = useResetWorkflowStep();
  
  const completedById = step?.progress?.completed_by;
  const { data: completedByMembers } = useTeamMembersById(completedById ? [completedById] : []);
  const completedByMember = completedByMembers?.[0];

  if (!step) return null;

  const phase = WORKFLOW_PHASES[getStepPhase(step.step_key)];
  const isCompleted = step.progress?.status === 'completed';
  const isSkipped = step.progress?.status === 'skipped';
  const canComplete = !step.isBlocked && !isCompleted && !isSkipped;
  const canSkip = !step.isBlocked && step.can_skip && !isCompleted && !isSkipped;
  const canReset = isCompleted || isSkipped;

  const handleComplete = async () => {
    await completeStep.mutateAsync({
      entityType,
      entityId,
      stepKey: step.step_key,
      notes: notes || undefined,
    });
    setNotes('');
    onOpenChange(false);
  };

  const handleSkip = async () => {
    if (!notes.trim()) {
      return; // Require notes for skipping
    }
    await completeStep.mutateAsync({
      entityType,
      entityId,
      stepKey: step.step_key,
      notes,
      skip: true,
    });
    setNotes('');
    onOpenChange(false);
  };

  const handleReset = async () => {
    await resetStep.mutateAsync({
      entityType,
      entityId,
      stepKey: step.step_key,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className={cn('text-white', phase.color)}>
              {phase.label}
            </Badge>
            {isCompleted && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
            {isSkipped && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                <SkipForward className="h-3 w-3 mr-1" />
                Skipped
              </Badge>
            )}
            {step.isBlocked && (
              <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                <Lock className="h-3 w-3 mr-1" />
                Blocked
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl">
            {step.step_name}
            {step.step_name_cn && (
              <span className="text-muted-foreground font-normal ml-2">
                / {step.step_name_cn}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Step {step.step_order} of the workflow
            {step.is_required && ' • Required'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Blocking info */}
          {step.isBlocked && step.blockedBySteps.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Step Blocked</p>
                  <p className="text-sm text-red-600">
                    Complete these steps first: {step.blockedBySteps.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Completion info */}
          {(isCompleted || isSkipped) && step.progress?.completed_at && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                {completedByMember ? (
                  <>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {completedByMember.display_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{completedByMember.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(step.progress.completed_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unknown user</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(step.progress.completed_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {step.progress.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{step.progress.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Responsible roles */}
          {step.responsible_roles && step.responsible_roles.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Responsible:</p>
              <div className="flex flex-wrap gap-1">
                {step.responsible_roles.map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {role.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes input */}
          {canComplete && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this step..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {canSkip && (
            <div className="space-y-2">
              <Label htmlFor="skip-notes">Skip Reason (required)</Label>
              <Textarea
                id="skip-notes"
                placeholder="Explain why this step is being skipped..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {canReset && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetStep.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Step
            </Button>
          )}
          
          {canSkip && (
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={!notes.trim() || completeStep.isPending}
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip
            </Button>
          )}
          
          {canComplete && (
            <Button
              onClick={handleComplete}
              disabled={completeStep.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
          
          {step.isBlocked && (
            <Button disabled variant="secondary">
              <Lock className="h-4 w-4 mr-2" />
              Blocked
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
