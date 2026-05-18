import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Wrench, Settings, LogOut } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/vendors', label: 'Vendors', icon: Wrench },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuthContext();

  return (
    <div className="mx-auto flex min-h-svh max-w-[640px] flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <h1
            className="cursor-pointer text-lg font-bold text-primary"
            onClick={() => navigate('/dashboard')}
          >
            TurnoverKit
          </h1>
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
