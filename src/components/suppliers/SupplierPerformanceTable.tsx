import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  SupplierPerformance, 
  getPerformanceGrade,
  getMetricColor 
} from '@/hooks/useSupplierPerformance';

interface SupplierPerformanceTableProps {
  suppliers: SupplierPerformance[];
  isLoading?: boolean;
  onRowClick?: (supplierId: string) => void;
}

export function SupplierPerformanceTable({ 
  suppliers, 
  isLoading,
  onRowClick 
}: SupplierPerformanceTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No supplier performance data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead className="text-center">QC Pass Rate</TableHead>
            <TableHead className="text-center">On-Time Delivery</TableHead>
            <TableHead className="text-center">Avg Defect Rate</TableHead>
            <TableHead className="text-center">Inspections</TableHead>
            <TableHead className="text-center">POs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier, index) => {
            const grade = getPerformanceGrade(supplier.performance_score);
            const qcColor = getMetricColor(supplier.qc_pass_rate, { good: 90, warning: 70 });
            const deliveryColor = getMetricColor(supplier.on_time_delivery_rate, { good: 90, warning: 70 });
            const defectColor = supplier.avg_defect_rate !== null 
              ? (supplier.avg_defect_rate <= 2 ? 'text-green-600' : supplier.avg_defect_rate <= 5 ? 'text-yellow-600' : 'text-red-600')
              : 'text-muted-foreground';

            return (
              <TableRow 
                key={supplier.supplier_id}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onRowClick?.(supplier.supplier_id)}
              >
                <TableCell>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{supplier.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">{supplier.contact_person}</p>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={supplier.performance_score || 0} 
                      className="h-2 w-16"
                    />
                    <span className="font-medium text-sm">
                      {supplier.performance_score?.toFixed(0) || 'N/A'}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={`${grade.color} text-white`}>
                    {grade.grade}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`font-medium ${qcColor}`}>
                    {supplier.qc_pass_rate !== null ? `${supplier.qc_pass_rate}%` : 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`font-medium ${deliveryColor}`}>
                    {supplier.on_time_delivery_rate !== null ? `${supplier.on_time_delivery_rate}%` : 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`font-medium ${defectColor}`}>
                    {supplier.avg_defect_rate !== null ? `${supplier.avg_defect_rate}%` : 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {supplier.total_inspections || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">
                    {supplier.total_purchase_orders || 0}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
