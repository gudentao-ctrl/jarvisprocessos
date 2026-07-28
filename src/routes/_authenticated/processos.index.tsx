import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Workflow, ChevronRight, Building2 } from "lucide-react";
import { listProcesses, createProcess } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader, StatPill } from "@/components/mapping/PageHeader";
import { EmptyState, CardSkeleton } from "@/components/mapping/EmptyState";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/processos/")({
  component: ProcessosPage,
});

type Proc = Awaited<ReturnType<typeof listProcesses>>[number];
type Company = Awaited<ReturnType<typeof listCompanies>>[number];

const LEVEL_STYLE: Record<string, string> = {
  "0": "bg-map-process/15 text-map-process",
  "1": "bg-map-info/15 text-map-info",
  "2": "bg-map-decision/15 text-map-decision",
};

function ProcessosPage() {
  const router = useRouter();
  const { companyId } = useActiveCompany();
  const [processes, setProcesses] = useState<Proc[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_id: companyId ?? "", parent_id: "", level: "0" as "0" | "1" | "2", name: "" });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listProcesses({ data: companyId ? { company_id: companyId } : {} }),
      listCompanies(),
    ]).then(([p, c]) => {
      setProcesses(p as Proc[]);
      setCompanies(c as Company[]);
      setLoading(false);
    });
  }, [companyId]);

  useEffect(() => {
    if (companyId) setForm((f) => ({ ...f, company_id: companyId }));
  }, [companyId]);

  async function submit() {
    if (!form.company_id || !form.name) return toast.error("Empresa e nome são obrigatórios");
    try {
      const row = await createProcess({
        data: {
          company_id: form.company_id,
          parent_id: form.parent_id || null,
          level: form.level,
          name: form.name,
        },
      });
      toast.success("Processo criado");
      setOpen(false);
      router.navigate({ to: "/processos/$id", params: { id: row.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar");
    }
  }

  const byCompany = useMemo(() => {
    const m = new Map<string, Proc[]>();
    for (const p of processes) {
      const key = p.company_id ?? "sem";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    return m;
  }, [processes]);

  const counts = useMemo(() => ({
    n0: processes.filter((p) => p.level === "0").length,
    n1: processes.filter((p) => p.level === "1").length,
    n2: processes.filter((p) => p.level === "2").length,
  }), [processes]);

  const parentOptions = processes.filter((p) => p.company_id === form.company_id && p.level !== "2");

  const newButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="min-h-10"><Plus className="h-4 w-4 mr-1.5" /> Novo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo processo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Empresa</Label>
            <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v, parent_id: "" })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nível</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">N0 — Macroprocesso</SelectItem>
                <SelectItem value="1">N1 — Processo principal</SelectItem>
                <SelectItem value="2">N2 — Subprocesso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.level !== "0" && (
            <div>
              <Label>Processo pai</Label>
              <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {parentOptions.map((p) => <SelectItem key={p.id} value={p.id}>N{p.level} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <Button onClick={submit} className="w-full min-h-11">Criar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Processos & BPM"
        subtitle="Mapeamento hierárquico N0 / N1 / N2"
        icon={Workflow}
        accent="process"
        actions={newButton}
        stats={
          <>
            <StatPill label="Macroprocessos" value={counts.n0} accent="process" />
            <StatPill label="Processos" value={counts.n1} accent="info" />
            <StatPill label="Subprocessos" value={counts.n2} accent="decision" />
            <StatPill label="Empresas" value={byCompany.size} accent="time" />
          </>
        }
      />

      {loading ? (
        <CardSkeleton rows={4} />
      ) : processes.length === 0 ? (
        <EmptyState
          icon={Workflow}
          accent="process"
          title="Nenhum processo mapeado"
          description="Crie o primeiro processo ou gere automaticamente a partir de uma entrevista."
          action={newButton}
        />
      ) : (
        <div className="space-y-4">
          {[...byCompany.entries()].map(([cid, list]) => {
            const c = companies.find((x) => x.id === cid);
            const roots = list.filter((p) => !p.parent_id);
            return (
              <section key={cid} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <h2 className="min-w-0 truncate text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {c?.name ?? "Sem empresa"}
                  </h2>
                  <span className="ml-auto shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                    {list.length}
                  </span>
                </div>
                <div className="p-2">
                  {roots.map((p) => <ProcessNode key={p.id} p={p} all={list} depth={0} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProcessNode({ p, all, depth }: { p: Proc; all: Proc[]; depth: number }) {
  const children = all.filter((x) => x.parent_id === p.id);
  const initials = (p.responsible ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <div>
      <div className="relative" style={{ paddingLeft: depth * 18 }}>
        {depth > 0 && (
          <span
            aria-hidden
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: depth * 18 - 9 }}
          />
        )}
        <Link
          to="/processos/$id"
          params={{ id: p.id }}
          className="group flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-secondary/70"
        >
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase",
              LEVEL_STYLE[String(p.level)] ?? LEVEL_STYLE["2"],
            )}
          >
            N{p.level}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
          {children.length > 0 && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
              {children.length}
            </span>
          )}
          {initials && (
            <span
              title={p.responsible ?? ""}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-map-process/15 text-[10px] font-bold text-map-process"
            >
              {initials}
            </span>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
      {children.map((c) => <ProcessNode key={c.id} p={c} all={all} depth={depth + 1} />)}
    </div>
  );
}
