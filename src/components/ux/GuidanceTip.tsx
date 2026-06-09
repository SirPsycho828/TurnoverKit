import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function GuidanceTip({
  id,
  children,
  icon: Icon = Lightbulb,
}: {
  id: string;
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  const storageKey = `ux-tip-${id}`;
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(storageKey) === 'true',
  );

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/40 p-3 text-sm animate-in fade-in duration-200">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
      <p className="flex-1 text-muted-foreground">{children}</p>
      <button
        onClick={() => {
          localStorage.setItem(storageKey, 'true');
          setDismissed(true);
        }}
        className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Dismiss tip"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
