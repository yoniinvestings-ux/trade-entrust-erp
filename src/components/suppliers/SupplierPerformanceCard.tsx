import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  ClipboardCheck, 
  Truck, 
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  SupplierPerformance, 
  getPerformanceGrade, 
  getMetricColor 
} from '@/hooks/useSupplierPerformance';

interface SupplierPerformanceCardProps {
  performance: SupplierPerformance | null;
  isLoading?: boolean;
  compact?: boolean;
}

export function SupplierPerformanceCard({ 
  performance, 
  isLoading,
  compact = false 
}: SupplierPerformanceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!performance) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No performance data available
        </CardContent>
      </Card>
    );
  }

  const grade = getPerformanceGrade(performance.performance_score);
  const qcColor = getMetricColor(performance.qc_pass_rate, { good: 90, warning: 70 });
  const deliveryColor = getMetricColor(performance.on_time_delivery_rate, { good: 90, warning: 70 });
  const defectColor = performance.avg_defect_rate !== null 
    ? (performance.avg_defect_rate <= 2 ? 'text-green-600' : performance.avg_defect_rate <= 5 ? 'text-yellow-600' : 'text-red-600')
    : 'text-muted-foreground';

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full ${grade.color} flex items-center justify-center text-white font-bold text-lg`}>
          {grade.grade}
        </div>
        <div>
          <p className="text-sm font-medium">{performance.performance_score?.toFixed(0) || 'N/A'}%</p>
          <p className="text-xs text-muted-foreground">{grade.label}</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Score
          </span>
          <Badge className={`${grade.color} text-white text-lg px-3 py-1`}>
            {grade.grade}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall Score</span>
            <span className="text-2xl font-bold">
              {performance.performance_score?.toFixed(1) || 'N/A'}%
            </span>
          </div>
          <Progress 
            value={performance.performance_score || 0} 
            className="h-3"
          />
          <p className="text-xs text-muted-foreground text-center">{grade.label}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* QC Pass Rate */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <ClipboardCheck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className={`text-xl font-bold ${qcColor}`}>
              {performance.qc_pass_rate !== null ? `${performance.qc_pass_rate}%` : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">QC Pass Rate</p>
            <p className="text-xs text-muted-foreground mt-1">
              {performance.passed_inspections || 0}/{performance.total_inspections || 0} passed
            </p>
          </div>

          {/* On-Time Delivery */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Truck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className={`text-xl font-bold ${deliveryColor}`}>
              {performance.on_time_delivery_rate !== null ? `${performance.on_time_delivery_rate}%` : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">On-Time Delivery</p>
            <p className="text-xs text-muted-foreground mt-1">
              {performance.on_time_deliveries || 0}/{performance.total_purchase_orders || 0} on time
            </p>
          </div>

          {/* Defect Rate */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className={`text-xl font-bold ${defectColor}`}>
              {performance.avg_defect_rate !== null ? `${performance.avg_defect_rate}%` : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Avg Defect Rate</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lower is better
            </p>
          </div>
        </div>

        {/* Inspection Summary */}
        {(performance.total_inspections || 0) > 0 && (
          <div className="flex items-center justify-center gap-6 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{performance.passed_inspections || 0} Passed</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>{performance.failed_inspections || 0} Failed</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
