import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "font-mono text-[0.7rem] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
        className
      )}
      {...props}
    />
  );
}
