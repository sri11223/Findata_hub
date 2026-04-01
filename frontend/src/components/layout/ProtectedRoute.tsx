import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { Permission, hasPermission } from '../../lib/rbac';
import { Role } from '../../lib/types';
import Spinner from '../ui/Spinner';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: Permission;
}

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-surface-400 mt-4 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && user && !hasPermission(user.role as Role, requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center glass-card p-12 max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-surface-100 mb-2">Access Denied</h2>
          <p className="text-surface-400 mb-6">
            You don't have permission to access this page. Contact your administrator for access.
          </p>
          <a href="/" className="btn-primary inline-block">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
