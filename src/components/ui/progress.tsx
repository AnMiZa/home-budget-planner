import * as React from "react";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly value?: number;
  readonly indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, className, indicatorClassName, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className={cn("h-full w-full flex-1 rounded-full bg-primary transition-transform", indicatorClassName)}
        style={{ transform: `translateX(${Math.max(0, Math.min(100, 100 - value))}%)` }}
      />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress };
