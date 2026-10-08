import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg mt-6", className)}>
      {Icon && <Icon className="h-10 w-10 text-zinc-600 mx-auto mb-3" />}
      <h3 className="text-zinc-300 font-medium text-lg">{title}</h3>
      <p className="text-zinc-500 text-sm mt-1 mb-4">{description}</p>
      
      {actionLabel && actionHref ? (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      ) : actionLabel && onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}
