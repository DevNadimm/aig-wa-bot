import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusChipVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      status: {
        success: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
        warning: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
        error: "bg-red-500/10 text-red-400 ring-red-500/20",
        info: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
        neutral: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
);

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusChipVariants> {
  label: string;
}

export function StatusChip({ className, status, label, ...props }: StatusChipProps) {
  // Try to map string to variant if exact status isn't passed but label matches common patterns
  let computedStatus = status;
  if (!computedStatus && label) {
    const lowerLabel = label.toLowerCase();
    if (["active", "published", "success", "completed"].includes(lowerLabel)) computedStatus = "success";
    else if (["pending", "warning"].includes(lowerLabel)) computedStatus = "warning";
    else if (["error", "cancelled", "failed"].includes(lowerLabel)) computedStatus = "error";
    else if (["info", "draft"].includes(lowerLabel)) computedStatus = "info";
    else computedStatus = "neutral";
  }

  return (
    <span
      className={cn(statusChipVariants({ status: computedStatus }), className)}
      {...props}
    >
      {label}
    </span>
  );
}
