import { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState({ icon: Icon, title, description, action, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("empty-state animate-fade-in", className)} {...props}>
        <Icon className="empty-state-icon" />
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-description">{description}</p>
        {action && (
          <Button onClick={action.onClick} className="mt-4">
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);

export { EmptyState };
