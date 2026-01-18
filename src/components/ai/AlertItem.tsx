import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, XCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Alert } from '@/hooks/useOperationsAdvisor';

interface AlertItemProps {
  alert: Alert;
  compact?: boolean;
}

const alertStyles = {
  critical: {
    bg: 'bg-red-500/10 border-red-500/30',
    icon: XCircle,
    iconColor: 'text-red-500',
    badge: 'bg-red-500 text-white',
  },
  urgent: {
    bg: 'bg-orange-500/10 border-orange-500/30',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    badge: 'bg-orange-500 text-white',
  },
  warning: {
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    icon: AlertCircle,
    iconColor: 'text-yellow-500',
    badge: 'bg-yellow-500 text-black',
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: Info,
    iconColor: 'text-blue-500',
    badge: 'bg-blue-500 text-white',
  },
};

export function AlertItem({ alert, compact = false }: AlertItemProps) {
  const navigate = useNavigate();
  const style = alertStyles[alert.type];
  const Icon = style.icon;

  const handleAction = () => {
    if (alert.actionUrl) {
      navigate(alert.actionUrl);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity',
          style.bg
        )}
        onClick={handleAction}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', style.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{alert.title}</p>
          <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    );
  }

  return (
    <div className={cn('p-4 rounded-lg border', style.bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', style.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', style.badge)}>
              {alert.type.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {alert.department}
            </span>
          </div>
          <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
          <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
          {alert.action && (
            <Button size="sm" variant="secondary" onClick={handleAction}>
              {alert.action}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
