import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authState } = useAuthContext();
  const location = useLocation();

  if (authState === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (authState === 'unverified') {
    return <Navigate to="/verify-email" replace />;
  }

  if (authState === 'needs_onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { authState } = useAuthContext();

  if (authState === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authState === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
