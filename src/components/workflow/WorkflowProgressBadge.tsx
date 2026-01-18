import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWorkflow, EntityType } from '@/hooks/useWorkflow';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowProgressBadgeProps {
  entityType: EntityType;
  entityId: string;
  showProgress?: boolean;
  className?: string;
}

export function WorkflowProgressBadge({ 
  entityType, 
  entityId, 
  showProgress = false,
  className 
}: WorkflowProgressBadgeProps) {
  const { completedSteps, totalSteps, progressPercentage, currentStep, isLoading } = useWorkflow(entityType, entityId);

  if (isLoading || totalSteps === 0) {
    return null;
  }

  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'bg-emerald-500 text-emerald-50';
    if (progressPercentage >= 75) return 'bg-blue-500 text-blue-50';
    if (progressPercentage >= 50) return 'bg-amber-500 text-amber-50';
    if (progressPercentage >= 25) return 'bg-orange-500 text-orange-50';
    return 'bg-gray-500 text-gray-50';
  };

  const getIcon = () => {
    if (progressPercentage >= 100) return <CheckCircle2 className="h-3 w-3" />;
    if (currentStep?.isBlocked) return <AlertCircle className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <Badge 
              variant="secondary" 
              className={cn('flex items-center gap-1 font-medium', getProgressColor())}
            >
              {getIcon()}
              {completedSteps}/{totalSteps}
            </Badge>
            {showProgress && (
              <Progress value={progressPercentage} className="h-1.5 w-16" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-sm">
            <p className="font-medium">{progressPercentage}% Complete</p>
            {currentStep && (
              <p className="text-muted-foreground">
                Current: {currentStep.step_name}
                {currentStep.step_name_cn && ` / ${currentStep.step_name_cn}`}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
