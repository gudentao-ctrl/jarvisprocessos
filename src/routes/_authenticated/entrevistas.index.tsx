import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listInterviews } from "@/lib/interviews.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, StatPill } from "@/components/mapping/PageHeader";
import { EmptyState, CardSkeleton } from "@/components/mapping/EmptyState";
import { cn } from "@/lib/utils";
import {
  Plus, Mic, Calendar, User, Building2, CheckCircle2, Clock, FileText, Search, SearchX,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/entrevistas/")({
  component: InterviewsList,
});

type StatusKey = "draft" | "transcribing" | "transcribed" | "analyzed";

const STATUS: Record<StatusKey, { label: string; badge: string; bar: string; chip: string }> = {
  draft: {
    label: "Rascunho",
    badge: "bg-muted text-muted-foreground",
    bar: "bg-acc-slate",
    chip: "bg-acc-slate/10 text-acc-slate",
  },
  transcribing: {
    label: "Transcrevendo",
    badge: "bg-acc-amber/15 text-acc-amber",
    bar: "bg-acc-amber",
    chip: "bg-acc-amber/10 text-acc-amber",
  },
  transcribed: {
    label: "Transcrito",
    badge: "bg-acc-blue/15 text-acc-blue",
    bar: "bg-acc-blue",
    chip: "bg-acc-blue/10 text-acc-blue",
  },
  analyzed: {
    label: "Analisado",
    badge: "bg-primary/15 text-primary",
    bar: "bg-primary",
    chip: "bg-primary/10 text-primary",
  },
};

const FILTERS: { key: "all" | StatusKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "draft", label: "Rascunho" },
  { key: "transcribed", label: "Transcrito" },
  { key: "analyzed", label: "Analisado" },
];

function InterviewsList() {
  const { companyId } = useActiveCompany();
  const list = useServerFn(listInterviews);
  const { data, isLoading } = useQuery({
    queryKey: ["interviews", companyId],
    queryFn: () => list({ data: companyId ? { company_id: companyId } : {} }),
  });

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | StatusKey>("all");

  const items: any[] = data ?? [];

  const counts = useMemo(() => {
    const c = { total: items.length, draft: 0, transcribed: 0, analyzed: 0 };
    for (const it of items) {
      if (it.status === "analyzed") c.analyzed++;
      else if (it.status === "transcribed" || it.status === "transcribing") c.transcribed++;
      else c.draft++;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== "all") {
        if (filter === "transcribed") {
          if (it.status !== "transcribed" && it.status !== "transcribing") return false;
        } else if (it.status !== filter) return false;
      }
      if (!term) return true;
      return (
        (it.title ?? "").toLowerCase().includes(term) ||
        (it.participant ?? "").toLowerCase().includes(term) ||
        (it.companies?.name ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, q, filter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Entrevistas"
        subtitle="Capture, transcreva e analise com IA"
        icon={Mic}
        accent="process"
        actions={
          <Button asChild size="sm" className="hidden h-10 sm:inline-flex">
            <Link to="/entrevistas/nova">
              <Plus className="mr-1.5 h-4 w-4" /> Nova
            </Link>
          </Button>
        }
        stats={
          <>
            <StatPill label="Total" value={counts.total} accent="process" />
            <StatPill label="Transcritas" value={counts.transcribed} accent="info" />
            <StatPill label="Analisadas" value={counts.analyzed} accent="decision" />
            <StatPill label="Rascunhos" value={counts.draft} accent="time" />
          </>
        }
      />

      <Button asChild className="h-12 w-full text-base font-semibold shadow-sm sm:hidden">
        <Link to="/entrevistas/nova">
          <Plus className="mr-2 h-5 w-5" /> Nova Entrevista
        </Link>
      </Button>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, participante ou empresa"
            className="h-11 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <CardSkeleton rows={4} />}

      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={Mic}
          title="Nenhuma entrevista ainda"
          description="Grave ou envie um áudio para que a IA transcreva e transforme em entregáveis."
          accent="process"
          action={
            <Button asChild>
              <Link to="/entrevistas/nova">
                <Plus className="mr-2 h-4 w-4" /> Criar primeira entrevista
              </Link>
            </Button>
          }
        />
      )}

      {!isLoading && items.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="Nenhum resultado"
          description="Ajuste a busca ou o filtro de status para ver outras entrevistas."
          accent="info"
        />
      )}

      <div className="space-y-2">
        {filtered.map((it: any) => {
          const s = STATUS[(it.status as StatusKey) in STATUS ? (it.status as StatusKey) : "draft"];
          return (
            <Link key={it.id} to="/entrevistas/$id" params={{ id: it.id }} className="block">
              <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <span className={cn("absolute inset-y-0 left-0 w-1", s.bar)} aria-hidden />
                <div className="flex items-start gap-3 p-4 pl-5">
                  <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", s.chip)}>
                    <Mic className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <h3 className="truncate font-bold">{it.title}</h3>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          s.badge,
                        )}
                      >
                        {it.status === "analyzed" ? (
                          <CheckCircle2 className="mr-0.5 inline h-3 w-3" />
                        ) : it.status === "transcribing" ? (
                          <Clock className="mr-0.5 inline h-3 w-3 animate-spin" />
                        ) : it.status === "transcribed" ? (
                          <FileText className="mr-0.5 inline h-3 w-3" />
                        ) : null}
                        {s.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {it.companies?.name && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {it.companies.name}
                            {it.sectors?.name ? ` • ${it.sectors.name}` : ""}
                          </span>
                        </span>
                      )}
                      {it.participant && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" /> {it.participant}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" /> {it.interview_date}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
