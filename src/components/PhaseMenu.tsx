import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LayoutGrid, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PHASES, type PhaseSlug } from "@/lib/phases";
import { cn } from "@/lib/utils";

export function PhaseMenu({ current }: { current?: PhaseSlug }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const currentLabel = PHASES.find((p) => p.slug === current)?.label ?? "Etapas";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{currentLabel}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] p-1">
        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Etapas da consultoria
        </div>
        {PHASES.map((p) => {
          const active = p.slug === current;
          const to = p.slug === "controle" ? "/controle" : "/fase/$slug";
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => {
                setOpen(false);
                if (p.slug === "controle") navigate({ to: "/controle" });
                else navigate({ to: "/fase/$slug", params: { slug: p.slug } });
              }}
              className={cn(
                "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                active && "bg-accent",
              )}
            >
              <Check className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-primary" : "opacity-0")} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.label}</p>
                {p.description && (
                  <p className="truncate text-xs text-muted-foreground">{p.description}</p>
                )}
              </div>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// Optional inline grid variant (used inside Controle)
export function PhaseGrid() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {PHASES.filter((p) => p.slug !== "controle").map((p) => (
        <Link
          key={p.slug}
          to="/fase/$slug"
          params={{ slug: p.slug }}
          className="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-secondary/50 active:bg-secondary"
        >
          <p className="text-sm font-semibold">{p.label}</p>
          {p.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
          )}
        </Link>
      ))}
    </div>
  );
}
