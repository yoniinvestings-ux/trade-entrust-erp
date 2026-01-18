import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCreateQCInspection, INSPECTION_TYPES, AQL_LEVELS, DEFAULT_INSPECTION_CHECKS } from '@/hooks/useQCInspections';
import { useCreateInspectionItem } from '@/hooks/useQCInspections';

interface QCInspectionScheduleDialogProps {
  children: React.ReactNode;
  poId?: string;
  orderId?: string;
  defaultPOId?: string;
  onSuccess?: () => void;
}

export function QCInspectionScheduleDialog({
  children,
  poId,
  orderId,
  defaultPOId,
  onSuccess,
}: QCInspectionScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(orderId || '');
  const [selectedPOId, setSelectedPOId] = useState(poId || defaultPOId || '');
  const [inspectionType, setInspectionType] = useState('final');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [location, setLocation] = useState('');
  const [aqlLevel, setAqlLevel] = useState('S4');
  const [sampleSize, setSampleSize] = useState<number>(80);
  const [notes, setNotes] = useState('');
  
  const createInspection = useCreateQCInspection();
  const createItem = useCreateInspectionItem();

  // Fetch orders
  const { data: orders } = useQuery({
    queryKey: ['orders-for-qc-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer:customers(company_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch POs based on selected order
  const { data: purchaseOrders } = useQuery({
    queryKey: ['pos-for-qc-schedule', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return [];
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, supplier:suppliers(supplier_name)')
        .eq('order_id', selectedOrderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOrderId,
  });

  const handleSubmit = async () => {
    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }

    try {
      const inspection = await createInspection.mutateAsync({
        order_id: selectedOrderId,
        po_id: selectedPOId && selectedPOId !== 'none' ? selectedPOId : null,
        status: 'pending',
        inspection_type: inspectionType,
        scheduled_date: scheduledDate?.toISOString() || null,
        location: location || null,
        aql_level: aqlLevel,
        sample_size: sampleSize,
        defect_rate: 0,
        report: notes || null,
      });

      // Create default inspection items
      for (const check of DEFAULT_INSPECTION_CHECKS) {
        await createItem.mutateAsync({
          inspection_id: inspection.id,
          check_category: check.category,
          check_name: check.name,
          check_name_cn: check.name_cn,
          requirement: check.requirement,
          requirement_cn: check.requirement_cn,
        });
      }

      toast.success('QC Inspection scheduled successfully / QC检验已安排');
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error('Failed to schedule inspection: ' + error.message);
    }
  };

  const resetForm = () => {
    setSelectedOrderId(orderId || '');
    setSelectedPOId(poId || defaultPOId || '');
    setInspectionType('final');
    setScheduledDate(undefined);
    setLocation('');
    setAqlLevel('S4');
    setSampleSize(80);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Schedule QC Inspection / 安排QC检验</DialogTitle>
          <DialogDescription>
            Schedule a quality control inspection for a purchase order
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order / 订单 *</Label>
              <Select 
                value={selectedOrderId} 
                onValueChange={(v) => {
                  setSelectedOrderId(v);
                  setSelectedPOId('');
                }}
                disabled={!!orderId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  {orders?.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_number} - {order.customer?.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Purchase Order / 采购单</Label>
              <Select 
                value={selectedPOId || 'none'} 
                onValueChange={(v) => setSelectedPOId(v === 'none' ? '' : v)}
                disabled={!selectedOrderId || !!poId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PO (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific PO</SelectItem>
                  {purchaseOrders?.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number} - {po.supplier?.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inspection Type / 检验类型</Label>
              <Select value={inspectionType} onValueChange={setInspectionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSPECTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scheduled Date / 计划日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>AQL Level</Label>
              <Select value={aqlLevel} onValueChange={setAqlLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AQL_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sample Size / 样本量</Label>
              <Input
                type="number"
                min={1}
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value) || 80)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Factory Location / 工厂地址</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Factory address for inspection"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes / 备注</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions or notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createInspection.isPending}>
            {createInspection.isPending ? 'Scheduling...' : 'Schedule Inspection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
