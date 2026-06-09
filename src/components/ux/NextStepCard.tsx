import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

export function NextStepCard({
  title,
  description,
  to,
  actionLabel,
  icon: Icon,
}: {
  title: string;
  description: string;
  to: string;
  actionLabel?: string;
  icon?: LucideIcon;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 rounded-xl border-l-[3px] border-l-emerald bg-card p-3 shadow-sm">
      {Icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald/8">
          <Icon className="h-4.5 w-4.5 text-emerald" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-600">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" onClick={() => navigate(to)}>
        {actionLabel ?? 'Go'}
        <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
