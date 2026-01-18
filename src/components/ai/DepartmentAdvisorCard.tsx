import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertItem } from './AlertItem';
import type { Alert } from '@/hooks/useOperationsAdvisor';
import { cn } from '@/lib/utils';

interface DepartmentAdvisorCardProps {
  title: string;
  department: string;
  alerts: Alert[];
  score: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function DepartmentAdvisorCard({
  title,
  department,
  alerts,
  score,
  isLoading = false,
  onRefresh,
  className,
}: DepartmentAdvisorCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const departmentAlerts = alerts.filter(a => a.department === department);
  const criticalCount = departmentAlerts.filter(a => a.type === 'critical').length;
  const urgentCount = departmentAlerts.filter(a => a.type === 'urgent').length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {title}
                <span className={cn('text-2xl font-bold', getScoreColor(score))}>
                  {score}%
                </span>
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalCount} Critical
                  </Badge>
                )}
                {urgentCount > 0 && (
                  <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-600">
                    {urgentCount} Urgent
                  </Badge>
                )}
                {departmentAlerts.length === 0 && (
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                    All Clear ✓
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          {departmentAlerts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No issues detected. Great job! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {departmentAlerts.slice(0, 5).map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
              {departmentAlerts.length > 5 && (
                <p className="text-sm text-center text-muted-foreground py-2">
                  +{departmentAlerts.length - 5} more alerts
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
