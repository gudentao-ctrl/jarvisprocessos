import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MapAccent = "process" | "info" | "decision" | "pain" | "time";

export const accentText: Record<MapAccent, string> = {
  process: "text-map-process",
  info: "text-map-info",
  decision: "text-map-decision",
  pain: "text-map-pain",
  time: "text-map-time",
};

export const accentBg: Record<MapAccent, string> = {
  process: "bg-map-process/10",
  info: "bg-map-info/10",
  decision: "bg-map-decision/10",
  pain: "bg-map-pain/10",
  time: "bg-map-time/10",
};

export const accentBar: Record<MapAccent, string> = {
  process: "bg-map-process",
  info: "bg-map-info",
  decision: "bg-map-decision",
  pain: "bg-map-pain",
  time: "bg-map-time",
};

export const accentRing: Record<MapAccent, string> = {
  process: "hover:border-map-process/40",
  info: "hover:border-map-info/40",
  decision: "hover:border-map-decision/40",
  pain: "hover:border-map-pain/40",
  time: "hover:border-map-time/40",
};

export function StatPill({
  label,
  value,
  accent = "process",
}: {
  label: string;
  value: ReactNode;
  accent?: MapAccent;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2 backdrop-blur-sm">
      <p className={cn("text-lg font-black leading-none tabular-nums", accentText[accent])}>{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  accent = "process",
  stats,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: MapAccent;
  stats?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 p-4 shadow-sm sm:p-5",
        "bg-gradient-to-br from-card via-card to-transparent",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full blur-3xl opacity-60",
          accentBg[accent],
        )}
      />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border/60",
                accentBg[accent],
                accentText[accent],
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {stats && (
        <div className="relative mt-4 flex flex-wrap gap-2">{stats}</div>
      )}
    </header>
  );
}
