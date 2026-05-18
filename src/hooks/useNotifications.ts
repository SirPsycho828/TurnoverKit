import { useEffect } from 'react';
import { differenceInDays, isPast } from 'date-fns';
import { toast } from 'sonner';
import type { Turnover, WithId } from '@/types';

export function useNotifications(turnovers: WithId<Turnover>[]) {
  useEffect(() => {
    const active = turnovers.filter(
      (t) => t.status !== 'archived' && t.status !== 'finalized',
    );

    for (const t of active) {
      const depositDue = t.depositDueDate.toDate();
      const daysLeft = differenceInDays(depositDue, new Date());

      if (isPast(depositDue)) {
        toast.error(
          `${t.tenantName}: Deposit return is overdue! Act immediately.`,
          { id: `overdue-${t.id}`, duration: 10000 },
        );
      } else if (daysLeft <= 3) {
        toast.warning(
          `${t.tenantName}: Deposit due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
          { id: `urgent-${t.id}`, duration: 8000 },
        );
      } else if (daysLeft <= 7) {
        toast.info(
          `${t.tenantName}: Deposit due in ${daysLeft} days.`,
          { id: `reminder-${t.id}`, duration: 5000 },
        );
      }
    }
  }, [turnovers]);
}
