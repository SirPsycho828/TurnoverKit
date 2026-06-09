import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Wrench, Settings, LogOut, Shield } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AppTour } from '@/components/onboarding/AppTour';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: Home, tourId: 'nav-home' },
  { path: '/vendors', label: 'Vendors', icon: Wrench, tourId: 'nav-vendors' },
  { path: '/settings', label: 'Settings', icon: Settings, tourId: 'nav-settings' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuthContext();

  return (
    <div className="mx-auto flex min-h-svh max-w-[640px] flex-col bg-background">
      <AppTour />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 transition-opacity active:opacity-70"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Shield className="h-4 w-4 text-emerald" />
            </div>
            <span className="font-heading text-lg font-700 tracking-tight text-foreground">
              TurnoverKit
            </span>
          </button>
          <button
            onClick={signOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-40 border-t border-border/50 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                data-tour={item.tourId}
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-xl px-5 py-1.5 transition-all duration-200',
                  isActive
                    ? 'text-emerald'
                    : 'text-muted-foreground active:scale-95 active:text-foreground',
                )}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-emerald/8" />
                )}
                <Icon
                  className={cn(
                    'relative h-5 w-5 transition-all duration-200',
                    isActive && 'stroke-[2.5px]',
                  )}
                />
                <span
                  className={cn(
                    'relative text-[11px] transition-all duration-200',
                    isActive ? 'font-600' : 'font-500',
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
