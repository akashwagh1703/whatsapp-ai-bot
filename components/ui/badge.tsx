import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "ai" | "outline" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-slate-100 text-slate-700",
        variant === "ai" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        variant === "outline" && "border border-slate-200 text-slate-600",
        variant === "warning" && "bg-amber-50 text-amber-800",
        className
      )}
      {...props}
    />
  );
}
