import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
        <Shield className="h-6 w-6 animate-pulse text-emerald" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
        Loading...
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authState } = useAuthContext();
  const location = useLocation();

  if (authState === 'loading') {
    return <LoadingScreen />;
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
    return <LoadingScreen />;
  }

  if (authState === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  if (authState === 'needs_onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (authState === 'unverified') {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}
