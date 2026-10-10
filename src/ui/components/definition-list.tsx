import type { ReactNode } from "react";

import { cn } from "@/ui/lib/utils";

/** 详情类页面的「标签 + 值」列表，三处页面共用一套排版。 */
export function DefinitionList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("divide-y text-sm", className)}>{children}</dl>;
}

export interface DefinitionRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function DefinitionRow({ label, value, className }: DefinitionRowProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0",
        className,
      )}
    >
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="numeric min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}
