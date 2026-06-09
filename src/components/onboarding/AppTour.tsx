import { useState, useEffect, useCallback } from 'react';
import { useJoyride, STATUS, type EventData } from 'react-joyride';
import { TourTooltip } from './TourTooltip';

const TOUR_KEY = 'turnoverkit-tour-completed';
const TOUR_PENDING_KEY = 'turnoverkit-tour-pending';

const steps = [
  {
    target: '[data-tour="stats"]',
    title: 'Your command center',
    content:
      'Track your properties and active turnovers at a glance. Status breakdowns show you what needs attention.',
    placement: 'bottom' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-property"]',
    title: 'Start here',
    content:
      'Add your first property, then create a turnover when a tenant gives notice.',
    placement: 'bottom' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="next-step"]',
    title: 'Follow the workflow',
    content:
      'TurnoverKit guides you step by step: Property \u2192 Turnover \u2192 Inspect \u2192 Deductions \u2192 Finalize. These cards always show your next action.',
    placement: 'bottom' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-vendors"]',
    title: 'Vendor directory',
    content:
      'Save your go-to contractors here so you can dispatch them quickly during turnovers.',
    placement: 'top' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-settings"]',
    title: 'Your preferences',
    content:
      'Set your default state for new properties and manage your account. You can also replay this tour from here.',
    placement: 'top' as const,
    disableBeacon: true,
  },
];

export function useAppTour() {
  const isCompleted = localStorage.getItem(TOUR_KEY) === 'true';
  const isPending = localStorage.getItem(TOUR_PENDING_KEY) === 'true';

  const startTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEY);
    localStorage.setItem(TOUR_PENDING_KEY, 'true');
    // Force re-render by dispatching a custom event
    window.dispatchEvent(new Event('tour-start'));
  }, []);

  return { isCompleted, isPending, startTour };
}

export function AppTour() {
  const [run, setRun] = useState(() => {
    const completed = localStorage.getItem(TOUR_KEY) === 'true';
    const pending = localStorage.getItem(TOUR_PENDING_KEY) === 'true';
    return !completed || pending;
  });

  // Listen for manual tour start (from Settings)
  useEffect(() => {
    const handler = () => setRun(true);
    window.addEventListener('tour-start', handler);
    return () => window.removeEventListener('tour-start', handler);
  }, []);

  const handleEvent = useCallback((data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem(TOUR_KEY, 'true');
      localStorage.removeItem(TOUR_PENDING_KEY);
    }
  }, []);

  const { Tour } = useJoyride({
    continuous: true,
    run,
    steps,
    onEvent: handleEvent,
    options: {
      overlayColor: 'rgba(15, 23, 42, 0.5)',
      spotlightPadding: 8,
    },
    tooltipComponent: TourTooltip,
    scrollToFirstStep: true,
  });

  return Tour;
}
