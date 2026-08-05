"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "critical" | "primary";
  className?: string;
  pulse?: boolean;
}

export function Badge({ children, variant = "default", className, pulse }: BadgeProps) {
  const variants = {
    default: "bg-white/5 text-muted border-border",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    critical: "bg-critical/10 text-critical border-critical/30",
    primary: "bg-primary/10 text-primary border-primary/30",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      variants[variant],
      pulse && variant === "critical" && "animate-pulse",
      className
    )}>
      {children}
    </span>
  );
}
