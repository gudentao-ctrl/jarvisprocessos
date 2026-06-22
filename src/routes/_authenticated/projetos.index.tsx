import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listProjects, createProject, deleteProject } from "@/lib/projects.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Briefcase, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projetos/")({
  component: ProjectsListPage,
});

const STATUS_LABELS: Record<string, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  arquivado: "Arquivado",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  em_andamento: "default",
  planejamento: "secondary",
  pausado: "outline",
  concluido: "outline",
  arquivado: "outline",
};

function ProjectsListPage() {
  const qc = useQueryClient();
  const list = useServerFn(listProjects);
  const listCo = useServerFn(listCompanies);
  const create = useServerFn(createProject);
  const remove = useServerFn(deleteProject);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => list() });
  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: () => listCo() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", responsible: "", company_id: "" });

  const createMut = useMutation({
    mutationFn: () => create({ data: { ...form, company_id: form.company_id } }),
    onSuccess: () => {
      setOpen(false);
      setForm({ name: "", description: "", responsible: "", company_id: "" });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Projeto excluído"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">Cada projeto organiza um ciclo de consultoria</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0"><Plus className="mr-1 h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo projeto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Empresa *</label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Responsável</label>
                <Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMut.mutate()} disabled={!form.name || !form.company_id || createMut.isPending}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects?.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed py-12 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum projeto criado</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {projects?.map((p: any) => (
          <Card key={p.id} className="p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{p.name}</h3>
                  <Badge variant={STATUS_VARIANTS[p.status] ?? "secondary"}>{STATUS_LABELS[p.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{p.companies?.name}</p>
                {p.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => confirm(`Excluir projeto "${p.name}"?`) && delMut.mutate(p.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${p.progress_pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.progress_pct}% concluído</p>
              </div>
              <Link to="/projetos/$id" params={{ id: p.id }}>
                <Button size="sm" variant="outline" className="shrink-0">Abrir <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
