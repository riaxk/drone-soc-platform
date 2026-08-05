import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

export function formatNumber(n: number) {
  return n.toLocaleString();
}

export function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "text-critical bg-critical/10 border-critical/30";
    case "medium": return "text-warning bg-warning/10 border-warning/30";
    case "low": return "text-primary bg-primary/10 border-primary/30";
    default: return "text-muted bg-white/5 border-border";
  }
}
