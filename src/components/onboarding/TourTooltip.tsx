import type { TooltipRenderProps } from 'react-joyride';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TourTooltip({
  backProps,
  closeProps,
  continuous,
  index,
  isLastStep,
  primaryProps,
  skipProps,
  size,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="relative w-[280px] rounded-xl border border-border/60 bg-card p-4 shadow-lg"
    >
      {/* Close button */}
      <button
        {...closeProps}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Content */}
      {step.title && (
        <h3 className="pr-6 font-heading text-sm font-700 tracking-tight">
          {step.title}
        </h3>
      )}
      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {step.content}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-500 text-muted-foreground/60">
          {index + 1} of {size}
        </span>
        <div className="flex items-center gap-1.5">
          {!isLastStep && (
            <button
              {...skipProps}
              className="rounded-md px-2 py-1 text-[11px] font-500 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Skip
            </button>
          )}
          {index > 0 && (
            <button
              {...backProps}
              className="rounded-md px-2 py-1 text-[11px] font-500 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Back
            </button>
          )}
          {continuous && (
            <Button size="sm" className="h-7 px-3 text-[11px]" {...primaryProps}>
              {isLastStep ? 'Done' : 'Next'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
