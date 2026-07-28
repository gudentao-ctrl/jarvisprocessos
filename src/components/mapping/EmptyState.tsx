import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { accentBg, accentText, type MapAccent } from "./PageHeader";

export function EmptyState({
  icon: Icon,
  title,
  description,
  accent = "process",
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: MapAccent;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <div
        className={cn(
          "mx-auto grid h-16 w-16 place-items-center rounded-2xl",
          accentBg[accent],
          accentText[accent],
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <p className="mt-4 text-base font-bold">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-border/60 bg-muted/50"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
