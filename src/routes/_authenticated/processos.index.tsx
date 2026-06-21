import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Workflow, ChevronRight } from "lucide-react";
import { listProcesses, createProcess } from "@/lib/processes.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/processos/")({
  component: ProcessosPage,
});

type Proc = Awaited<ReturnType<typeof listProcesses>>[number];
type Company = Awaited<ReturnType<typeof listCompanies>>[number];

function ProcessosPage() {
  const router = useRouter();
  const [processes, setProcesses] = useState<Proc[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_id: "", parent_id: "", level: "0" as "0" | "1" | "2", name: "" });

  useEffect(() => {
    Promise.all([listProcesses(), listCompanies()]).then(([p, c]) => {
      setProcesses(p as Proc[]);
      setCompanies(c as Company[]);
      setLoading(false);
    });
  }, []);

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

  const byCompany = new Map<string, Proc[]>();
  for (const p of processes) {
    const key = p.company_id ?? "sem";
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key)!.push(p);
  }
  const parentOptions = processes.filter((p) => p.company_id === form.company_id && p.level !== "2");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Processos</h1>
          <p className="text-sm text-muted-foreground">Mapeamento hierárquico N0 / N1 / N2</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Novo processo</Button>
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
              <Button onClick={submit} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : processes.length === 0 ? (
        <Card className="p-8 text-center">
          <Workflow className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum processo ainda. Crie o primeiro ou gere a partir de uma entrevista.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...byCompany.entries()].map(([cid, list]) => {
            const c = companies.find((x) => x.id === cid);
            const roots = list.filter((p) => !p.parent_id);
            return (
              <div key={cid}>
                <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">{c?.name ?? "Sem empresa"}</h2>
                <div className="space-y-1">
                  {roots.map((p) => <ProcessNode key={p.id} p={p} all={list} depth={0} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProcessNode({ p, all, depth }: { p: Proc; all: Proc[]; depth: number }) {
  const children = all.filter((x) => x.parent_id === p.id);
  return (
    <div>
      <Link
        to="/processos/$id"
        params={{ id: p.id }}
        className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-secondary group"
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <span className="text-[10px] font-bold uppercase rounded px-1.5 py-0.5 bg-primary/10 text-primary">N{p.level}</span>
        <span className="flex-1 text-sm">{p.name}</span>
        {p.responsible && <span className="text-xs text-muted-foreground">{p.responsible}</span>}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </Link>
      {children.map((c) => <ProcessNode key={c.id} p={c} all={all} depth={depth + 1} />)}
    </div>
  );
}
