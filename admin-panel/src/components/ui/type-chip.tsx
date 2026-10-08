import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const typeChipVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 font-mono text-zinc-300 ring-zinc-700",
        blue: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
        purple: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
        orange: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface TypeChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof typeChipVariants> {
  label: string;
}

export function TypeChip({ className, variant, label, ...props }: TypeChipProps) {
  if (!label) return null;

  return (
    <span
      className={cn(typeChipVariants({ variant }), className)}
      {...props}
    >
      {label}
    </span>
  );
}
