import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-8">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(var(--foreground) 1px, transparent 1px),
              linear-gradient(90deg, var(--foreground) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Emerald gradient glow — top right */}
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald/8 blur-3xl" />
        {/* Slate gradient glow — bottom left */}
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl bg-primary p-3 shadow-lg shadow-primary/20">
            <Shield className="h-7 w-7 text-emerald" />
          </div>
          <h1 className="font-heading text-2xl font-700 tracking-tight text-foreground">
            {title || 'TurnoverKit'}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
