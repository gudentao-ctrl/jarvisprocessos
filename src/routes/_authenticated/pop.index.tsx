import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClipboardList, Plus, Search, FileSignature } from "lucide-react";
import { listPops } from "@/lib/pop.functions";
import { useActiveCompany } from "@/lib/active-company";
import { PageHeader, StatPill } from "@/components/mapping/PageHeader";
import { EmptyState } from "@/components/mapping/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/pop/")({
  head: () => ({
    meta: [
      { title: "POP – Procedimento Operacional Padrão | JARVIS" },
      { name: "description", content: "Gere, edite e arquive Procedimentos Operacionais Padrão com apoio de IA, vinculados aos processos mapeados." },
      { property: "og:title", content: "POP – Procedimento Operacional Padrão | JARVIS" },
      { property: "og:description", content: "POPs gerados por IA a partir de descrição, fluxograma ou fluxo mapeado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PopListPage,
});

function PopListPage() {
  const { companyId } = useActiveCompany();
  const list = useServerFn(listPops);
  const [q, setQ] = useState("");

  const { data: pops = [], isLoading } = useQuery({
    queryKey: ["pops", companyId],
    queryFn: () => list({ data: companyId ? { company_id: companyId } : {} }),
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return pops;
    return pops.filter((p: any) =>
      [p.title, p.processes?.name, p.companies?.name].filter(Boolean).join(" ").toLowerCase().includes(t),
    );
  }, [pops, q]);

  const drafts = pops.filter((p: any) => p.status === "rascunho").length;
  const approved = pops.length - drafts;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Procedimento Operacional Padrão (POP)"
        subtitle="Gere automaticamente um POP utilizando IA. O documento poderá ser editado antes de ser salvo."
        icon={ClipboardList}
        accent="process"
        stats={
          <>
            <StatPill label="POPs" value={pops.length} accent="process" />
            <StatPill label="Rascunhos" value={drafts} accent="time" />
            <StatPill label="Aprovados" value={approved} accent="info" />
          </>
        }
        actions={
          <Button asChild>
            <Link to="/pop/$id" params={{ id: "novo" }}>
              <Plus className="mr-2 h-4 w-4" /> Novo POP
            </Link>
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por processo ou título…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Nenhum POP cadastrado"
          description="Gere um POP a partir de uma descrição, de um fluxograma enviado ou de um fluxo já mapeado no JARVIS."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((p: any) => (
            <Link key={p.id} to="/pop/$id" params={{ id: p.id }}>
              <Card className="flex items-start gap-3 p-4 transition-colors hover:bg-secondary/50">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-map-process/10 text-map-process">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[p.companies?.name, p.processes?.name].filter(Boolean).join(" · ") || "Sem processo vinculado"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide">
                    <span className={p.status === "aprovado" ? "rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600" : "rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-600"}>
                      {p.status}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">origem: {p.source_type}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
