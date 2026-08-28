import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive";
type Size = "default" | "sm" | "icon";

const variantClasses: Record<Variant, string> = {
  default:
    "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-sm shadow-cyan-900/10 hover:from-cyan-500 hover:to-teal-500 dark:from-cyan-400 dark:to-teal-300 dark:text-zinc-950 dark:shadow-cyan-500/20 dark:hover:from-cyan-300 dark:hover:to-teal-200",
  outline:
    "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:hover:bg-zinc-800",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
  destructive: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500",
};

const sizeClasses: Record<Size, string> = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  icon: "h-9 w-9 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 dark:focus-visible:ring-cyan-400 dark:focus-visible:ring-offset-zinc-950",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
