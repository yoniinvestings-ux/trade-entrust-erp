import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { usePermissionCheck } from '@/hooks/usePermissions';
import { ShieldX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PermissionGuardProps {
  module: string;
  children: ReactNode;
  requireAdmin?: boolean;
  fallbackMessage?: string;
}

export function PermissionGuard({ 
  module, 
  children, 
  requireAdmin = false,
  fallbackMessage = "You don't have permission to access this page."
}: PermissionGuardProps) {
  const { role, loading: authLoading } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissionCheck();
  const navigate = useNavigate();

  // Show loading while checking auth or permissions
  if (authLoading || permissionsLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Admin-only routes require super_admin role
  if (requireAdmin && role !== 'super_admin') {
    return <AccessDeniedPage message="This page requires administrator access." navigate={navigate} />;
  }

  // Check module permission
  if (!hasPermission(module, 'view')) {
    return <AccessDeniedPage message={fallbackMessage} navigate={navigate} />;
  }

  return <>{children}</>;
}

interface AccessDeniedPageProps {
  message: string;
  navigate: (path: string) => void;
}

function AccessDeniedPage({ message, navigate }: AccessDeniedPageProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      <p className="text-sm text-muted-foreground mb-6">
        If you believe you should have access, please contact your administrator.
      </p>
      <Button onClick={() => navigate('/dashboard')}>
        Return to Dashboard
      </Button>
    </div>
  );
}
