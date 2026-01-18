import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Order statuses
  draft: { label: 'Draft', className: 'status-draft' },
  sample_before_production: { label: 'Sample', className: 'status-sample_before_production' },
  production: { label: 'Production', className: 'status-production' },
  qc: { label: 'QC', className: 'status-qc' },
  shipping: { label: 'Shipping', className: 'status-shipping' },
  delivered: { label: 'Delivered', className: 'status-delivered' },
  cancelled: { label: 'Cancelled', className: 'status-cancelled' },
  
  // Lead statuses
  new: { label: 'New', className: 'status-new' },
  qualified: { label: 'Qualified', className: 'status-qualified' },
  proposal_sent: { label: 'Proposal Sent', className: 'status-proposal_sent' },
  won: { label: 'Won', className: 'status-won' },
  lost: { label: 'Lost', className: 'status-lost' },
  
  // PO statuses
  sent: { label: 'Sent', className: 'status-active' },
  confirmed: { label: 'Confirmed', className: 'status-qualified' },
  completed: { label: 'Completed', className: 'status-completed' },
  
  // Sourcing statuses
  searching: { label: 'Searching', className: 'status-searching' },
  quoted: { label: 'Quoted', className: 'status-quoted' },
  negotiating: { label: 'Negotiating', className: 'status-negotiating' },
  
  // QC statuses
  pending: { label: 'Pending', className: 'status-pending' },
  passed: { label: 'Passed', className: 'status-passed' },
  failed: { label: 'Failed', className: 'status-failed' },
  conditional: { label: 'Conditional', className: 'status-conditional' },
  
  // Shipment statuses
  preparing: { label: 'Preparing', className: 'status-draft' },
  in_transit: { label: 'In Transit', className: 'status-shipping' },
  customs: { label: 'Customs', className: 'status-qc' },
  delayed: { label: 'Delayed', className: 'status-cancelled' },
  
  // Customer/Supplier statuses
  active: { label: 'Active', className: 'status-active' },
  inactive: { label: 'Inactive', className: 'status-draft' },
  suspended: { label: 'Suspended', className: 'status-cancelled' },
  
  // Project statuses
  planning: { label: 'Planning', className: 'status-draft' },
  in_progress: { label: 'In Progress', className: 'status-production' },
  on_hold: { label: 'On Hold', className: 'status-pending' },
  
  // Task statuses
  todo: { label: 'To Do', className: 'status-draft' },
  
  // Financial statuses (reuses existing)
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { 
    label: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
    className: 'status-draft' 
  };

  return (
    <span className={cn('status-badge', config.className, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {config.label}
    </span>
  );
}
