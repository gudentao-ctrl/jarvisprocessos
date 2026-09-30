import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  listOpportunities,
  updateOpportunity,
  deleteOpportunity,
  approveOpportunityAsPlan,
  rejectOpportunity,
  createOpportunity,
} from "@/lib/analysis.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Check, X, Trash2, Edit3, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { listProcesses } from "@/lib/processes.functions";
import { useActiveCompany } from "@/lib/active-company";

export const Route = createFileRoute("/_authenticated/oportunidades/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Matriz de Oportunidades | Jarvis" },
      { name: "description", content: "Mesa de análise e aprovação das oportunidades de melhoria." },
      { property: "og:title", content: "Matriz de Oportunidades | Jarvis" },
      { property: "og:description", content: "Mesa de análise e aprovação das oportunidades de melhoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PRIO_COLOR: Record<string, string> = {
  critica: "bg-red-500/15 text-red-600 border-red-500/30",
  alta: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  media: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  sugerida: "Pendente",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  em_andamento: "Em andamento",
  implementada: "Implementada",
};

const ORIGIN_LABEL: Record<string, string> = {
  pain: "Dor",
  decision: "Decisão",
  information: "Informação",
};

function Page() {
  const { companyId, company } = useActiveCompany();
  const list = useServerFn(listOpportunities);
  const upd = useServerFn(updateOpportunity);
  const del = useServerFn(deleteOpportunity);
  const approve = useServerFn(approveOpportunityAsPlan);
  const reject = useServerFn(rejectOpportunity);
  const { data = [], isLoading } = useQuery({
    queryKey: ["opportunities", companyId],
    queryFn: () => list({ data: { company_id: companyId as string } }),
    enabled: Boolean(companyId),
  });
  const qc = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPrio, setFilterPrio] = useState<string>("all");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      data.filter(
        (o) =>
          (filterStatus === "all" || o.status === filterStatus) &&
          (filterPrio === "all" || o.priority === filterPrio) &&
          (filterOrigin === "all" || (o.source_bucket ?? o.source) === filterOrigin),
      ),
    [data, filterStatus, filterPrio, filterOrigin],
  );

  function mutate(fn: (id: string) => Promise<unknown>, msg: string) {
    return (id: string) =>
      fn(id)
        .then(() => {
          toast.success(msg);
          qc.invalidateQueries({ queryKey: ["opportunities"] });
        })
        .catch((e: Error) => toast.error(e.message));
  }

  const doDelete = mutate(
    (id) => del({ data: { id, company_id: companyId as string } }),
    "Excluída",
  );
  const doReject = mutate(
    (id) => reject({ data: { id, company_id: companyId as string } }),
    "Rejeitada",
  );

  async function doApprove(id: string) {
    try {
      if (!companyId) return;
      await approve({ data: { id, company_id: companyId, responsible: "" } });
      toast.success("Aprovada — plano de ação criado");
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function changeStatus(id: string, status: string) {
    if (!companyId) return;
    try {
      if (status === "aprovada") {
        await approve({ data: { id, company_id: companyId, responsible: "" } });
        toast.success("Aprovada — plano de ação criado");
      } else {
        await upd({ data: { id, company_id: companyId, patch: { status: status as never } } });
        toast.success("Status atualizado");
      }
      qc.invalidateQueries({ queryKey: ["opportunities", companyId] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Matriz de Oportunidades</h1>
          <p className="text-muted-foreground mt-1">
            {company ? `${company.name} · ` : ""}Analise os fluxos e converta oportunidades em ações.
          </p>
        </div>
        <NewOpportunityDialog
          companyId={companyId}
          onCreated={() => qc.invalidateQueries({ queryKey: ["opportunities"] })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPrio} onValueChange={setFilterPrio}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            {["critica", "alta", "media", "baixa"].map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterOrigin} onValueChange={setFilterOrigin}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="pain">Dor</SelectItem>
            <SelectItem value="decision">Decisão</SelectItem>
            <SelectItem value="information">Informação</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="ia">IA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!companyId && <p className="text-muted-foreground">Selecione uma empresa no topo.</p>}
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="grid gap-3">
        {filtered.map((o) => (
          <Card key={o.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{o.title}</span>
                    <Badge variant="outline" className={PRIO_COLOR[o.priority]}>
                      {o.priority}
                    </Badge>
                    <Select value={o.status} onValueChange={(status) => changeStatus(o.id, status)}>
                      <SelectTrigger className="h-7 w-auto min-w-28 border-0 bg-secondary px-2 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([status, label]) => (
                          <SelectItem key={status} value={status}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="outline">{o.category}</Badge>
                    <Badge variant="outline">
                      {ORIGIN_LABEL[o.source_bucket ?? ""] ?? (o.source === "manual" ? "Manual" : "IA")}
                    </Badge>
                    {o.source === "ia" && (
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/30"
                      >
                        IA
                      </Badge>
                    )}
                  </div>
                  {o.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {o.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                    {(o as { processes?: { name?: string } }).processes?.name && (
                      <span>Processo: {(o as { processes: { name: string } }).processes.name}</span>
                    )}
                    {(o as { companies?: { name?: string } }).companies?.name && (
                      <span>Empresa: {(o as { companies: { name: string } }).companies.name}</span>
                    )}
                    <span>
                      Esforço {o.effort} · Impacto {o.impact} · Score{" "}
                      {Number(o.priority_score).toFixed(1)}
                    </span>
                  </div>
                  {o.expected_benefit && (
                    <p className="text-xs mt-1">
                      <span className="font-medium">Benefício:</span> {o.expected_benefit}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {(o.status === "sugerida" || o.status === "em_analise") && (
                    <>
                      <Button size="sm" onClick={() => doApprove(o.id)}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Aprovar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => doReject(o.id)}>
                        <X className="h-3.5 w-3.5 mr-1" />
                        Rejeitar
                      </Button>
                    </>
                  )}
                  {o.status === "aprovada" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeStatus(o.id, "em_andamento")}
                    >
                      Iniciar
                    </Button>
                  )}
                  {o.status === "em_andamento" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeStatus(o.id, "implementada")}
                    >
                      Concluir
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditId(o.id)}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => doDelete(o.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  {(o as { action_plan_id?: string }).action_plan_id && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/planos-acao">
                        <ClipboardList className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhuma oportunidade.
            </CardContent>
          </Card>
        )}
      </div>

      {editId && (
        <EditDialog
          id={editId}
          onClose={() => setEditId(null)}
          item={data.find((x) => x.id === editId)!}
        />
      )}
    </div>
  );
}

function NewOpportunityDialog({
  companyId,
  onCreated,
}: {
  companyId: string | null;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const processesFn = useServerFn(listProcesses);
  const create = useServerFn(createOpportunity);
  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: () => processesFn(),
    enabled: open,
  });

  const [form, setForm] = useState({
    process_id: "",
    title: "",
    description: "",
    category: "desperdicio",
    expected_benefit: "",
    effort: "medio" as "baixo" | "medio" | "alto",
    impact: "medio" as "baixo" | "medio" | "alto",
  });

  async function submit() {
    if (!companyId || !form.title) {
      toast.error("Selecione uma empresa e informe o título");
      return;
    }
    try {
      await create({ data: { ...form, company_id: companyId, process_id: form.process_id || null } });
      toast.success("Oportunidade criada");
      setOpen(false);
      setForm({ ...form, title: "", description: "", expected_benefit: "" });
      onCreated();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Nova oportunidade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Processo (opcional)</Label>
            <Select
              value={form.process_id}
              onValueChange={(v) => setForm({ ...form, process_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {processes
                  .filter((p) => p.company_id === companyId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Benefício esperado</Label>
            <Input
              value={form.expected_benefit}
              onChange={(e) => setForm({ ...form, expected_benefit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Esforço</Label>
              <Select
                value={form.effort}
                onValueChange={(v) => setForm({ ...form, effort: v as "baixo" | "medio" | "alto" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["baixo", "medio", "alto"].map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impacto</Label>
              <Select
                value={form.impact}
                onValueChange={(v) => setForm({ ...form, impact: v as "baixo" | "medio" | "alto" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["baixo", "medio", "alto"].map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  id,
  item,
  onClose,
}: {
  id: string;
  item: {
    title: string;
    description: string;
    expected_benefit: string;
    effort: string;
    impact: string;
  };
  onClose: () => void;
}) {
  const { companyId } = useActiveCompany();
  const upd = useServerFn(updateOpportunity);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: item.title,
    description: item.description,
    expected_benefit: item.expected_benefit,
    effort: item.effort as "baixo" | "medio" | "alto",
    impact: item.impact as "baixo" | "medio" | "alto",
  });
  async function save() {
    try {
      if (!companyId) return;
      await upd({ data: { id, company_id: companyId, patch: form } });
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar oportunidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Benefício esperado</Label>
            <Input
              value={form.expected_benefit}
              onChange={(e) => setForm({ ...form, expected_benefit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Esforço</Label>
              <Select
                value={form.effort}
                onValueChange={(v) => setForm({ ...form, effort: v as "baixo" | "medio" | "alto" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["baixo", "medio", "alto"].map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impacto</Label>
              <Select
                value={form.impact}
                onValueChange={(v) => setForm({ ...form, impact: v as "baixo" | "medio" | "alto" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["baixo", "medio", "alto"].map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
