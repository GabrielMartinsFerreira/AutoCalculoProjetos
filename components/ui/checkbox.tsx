import * as React from "react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-zinc-300 text-cyan-600 accent-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-zinc-600 dark:accent-cyan-400 dark:focus-visible:ring-cyan-400",
          className
        )}
        {...props}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";
