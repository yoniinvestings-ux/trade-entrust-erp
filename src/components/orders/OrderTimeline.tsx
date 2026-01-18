import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle2, Circle, Clock, CalendarIcon, Package, Truck, ClipboardCheck, Factory, ShoppingCart, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineMilestone {
  key: string;
  label: string;
  icon: React.ReactNode;
  plannedDate?: Date | null;
  actualDate?: Date | null;
}

interface OrderTimelineProps {
  milestones: {
    order_confirmed_at?: string | null;
    po_sent_at?: string | null;
    production_started_at?: string | null;
    qc_completed_at?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    estimated_ship_date?: string | null;
    estimated_delivery_date?: string | null;
    factory_lead_days?: number | null;
    customer_lead_days?: number | null;
  };
  onUpdateMilestone?: (key: string, date: Date) => void;
  editable?: boolean;
}

const MILESTONE_CONFIG = [
  { key: 'order_confirmed_at', label: 'Order Confirmed', icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'po_sent_at', label: 'PO Sent to Factory', icon: <Package className="h-4 w-4" /> },
  { key: 'production_started_at', label: 'Production Started', icon: <Factory className="h-4 w-4" /> },
  { key: 'qc_completed_at', label: 'QC Inspection', icon: <ClipboardCheck className="h-4 w-4" /> },
  { key: 'shipped_at', label: 'Shipped', icon: <Truck className="h-4 w-4" /> },
  { key: 'delivered_at', label: 'Delivered', icon: <MapPin className="h-4 w-4" /> },
];

export function OrderTimeline({ milestones, onUpdateMilestone, editable = false }: OrderTimelineProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);

  const getMilestoneStatus = (key: string) => {
    const value = milestones[key as keyof typeof milestones];
    if (value && typeof value === 'string') return 'completed';
    
    // Check if previous milestone is completed
    const currentIndex = MILESTONE_CONFIG.findIndex(m => m.key === key);
    if (currentIndex > 0) {
      const prevKey = MILESTONE_CONFIG[currentIndex - 1].key;
      const prevValue = milestones[prevKey as keyof typeof milestones];
      if (prevValue && typeof prevValue === 'string') return 'current';
    }
    if (currentIndex === 0) return 'current';
    return 'pending';
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return null;
    }
  };

  const handleDateSelect = (key: string, date: Date | undefined) => {
    if (date && onUpdateMilestone) {
      onUpdateMilestone(key, date);
    }
    setSelectedMilestone(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Order Timeline</CardTitle>
          <div className="flex gap-2 text-sm">
            {milestones.factory_lead_days && (
              <Badge variant="outline">Factory: {milestones.factory_lead_days} days</Badge>
            )}
            {milestones.customer_lead_days && (
              <Badge variant="outline">Customer: {milestones.customer_lead_days} days</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
          
          <div className="space-y-4">
            {MILESTONE_CONFIG.map((config, index) => {
              const status = getMilestoneStatus(config.key);
              const dateValue = milestones[config.key as keyof typeof milestones];
              const formattedDate = typeof dateValue === 'string' ? formatDate(dateValue) : null;
              
              return (
                <div key={config.key} className="relative flex items-start gap-4 pl-2">
                  {/* Status icon */}
                  <div className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2",
                    status === 'completed' && "bg-primary border-primary text-primary-foreground",
                    status === 'current' && "bg-background border-primary text-primary",
                    status === 'pending' && "bg-muted border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      config.icon
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "font-medium",
                        status === 'pending' && "text-muted-foreground"
                      )}>
                        {config.label}
                      </p>
                      
                      {editable && status !== 'completed' ? (
                        <Popover open={selectedMilestone === config.key} onOpenChange={(open) => setSelectedMilestone(open ? config.key : null)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {formattedDate || 'Set date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={dateValue ? new Date(dateValue as string) : undefined}
                              onSelect={(date) => handleDateSelect(config.key, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      ) : formattedDate ? (
                        <span className={cn(
                          "text-sm",
                          status === 'completed' ? "text-muted-foreground" : "text-muted-foreground/70"
                        )}>
                          {formattedDate}
                        </span>
                      ) : null}
                    </div>
                    
                    {/* Estimated dates */}
                    {config.key === 'shipped_at' && milestones.estimated_ship_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Est: {formatDate(milestones.estimated_ship_date)}
                      </p>
                    )}
                    {config.key === 'delivered_at' && milestones.estimated_delivery_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Est: {formatDate(milestones.estimated_delivery_date)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
