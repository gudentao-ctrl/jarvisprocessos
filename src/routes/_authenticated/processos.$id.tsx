import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Trash2, Plus, Loader2 } from "lucide-react";
import { getProcess, updateProcess, deleteProcess, saveInformationItem, deleteInformationItem, saveDecisionItem, deleteDecisionItem, saveActionPlan } from "@/lib/processes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BpmFlow } from "@/components/BpmFlow";
import { FlowEditor } from "@/components/flow/FlowEditor";
import { getFlow } from "@/lib/flow.functions";

export const Route = createFileRoute("/_authenticated/processos/$id")({
  component: ProcessoDetail,
});

function ProcessoDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [data, setData] = useState<Awaited<ReturnType<typeof getProcess>> | null>(null);
  const [flow, setFlow] = useState<Awaited<ReturnType<typeof getFlow>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState({ name: "", description: "", objective: "", responsible: "", inputs: "", outputs: "" });

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      getProcess({ data: { id } }),
      getFlow({ data: { process_id: id } }),
    ]).then(([d, f]) => {
      setData(d);
      setFlow(f);
      setEdit({
        name: d.process.name ?? "",
        description: d.process.description ?? "",
        objective: d.process.objective ?? "",
        responsible: d.process.responsible ?? "",
        inputs: d.process.inputs ?? "",
        outputs: d.process.outputs ?? "",
      });
      setLoading(false);
    });
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  async function saveHeader() {
    try {
      await updateProcess({ data: { id, ...edit } });
      toast.success("Processo atualizado");
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function remove() {
    if (!confirm("Excluir este processo?")) return;
    try {
      await deleteProcess({ data: { id } });
      toast.success("Processo excluído");
      router.navigate({ to: "/processos" });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  if (loading || !data) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Link to="/processos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Processos
      </Link>

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase rounded px-1.5 py-0.5 bg-primary/10 text-primary">N{data.process.level}</span>
              <span className="text-xs text-muted-foreground">{data.process.companies?.name}</span>
            </div>
            <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="text-xl font-bold border-0 px-0 h-auto" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={saveHeader}>Salvar</Button>
            <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Objetivo" value={edit.objective} onChange={(v) => setEdit({ ...edit, objective: v })} />
          <Field label="Responsável" value={edit.responsible} onChange={(v) => setEdit({ ...edit, responsible: v })} />
          <Field label="Entradas" value={edit.inputs} onChange={(v) => setEdit({ ...edit, inputs: v })} />
          <Field label="Saídas" value={edit.outputs} onChange={(v) => setEdit({ ...edit, outputs: v })} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
        </div>
      </Card>

      <Tabs defaultValue="fluxo">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
          <TabsTrigger value="bpmn">BPMN</TabsTrigger>
          <TabsTrigger value="info">Informação ({data.informationMap.length})</TabsTrigger>
          <TabsTrigger value="decision">Decisão ({data.decisionMap.length})</TabsTrigger>
          <TabsTrigger value="indicators">Indicadores ({data.indicators.length})</TabsTrigger>
          <TabsTrigger value="plans">Planos ({data.actionPlans.length})</TabsTrigger>
          <TabsTrigger value="crono">Cronoanálise ({data.cronoanalysis.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="mt-4">
          {flow && (
            <FlowEditor
              processId={id}
              activities={flow.activities as any}
              connections={flow.connections as any}
              decisions={flow.decisions as any}
              onChange={reload}
            />
          )}
        </TabsContent>

        <TabsContent value="bpmn" className="mt-4">
          <BpmFlow processId={id} activities={data.activities as any} edges={data.edges as any} />
          <p className="text-xs text-muted-foreground text-center mt-2">Renderização automática — edite no Fluxo. BPMN 2.0 gerado na próxima fase.</p>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <InfoMapEditor processId={id} items={data.informationMap as any} activities={data.activities as any} onChange={reload} />
        </TabsContent>

        <TabsContent value="decision" className="mt-4">
          <DecisionMapEditor processId={id} items={data.decisionMap as any} activities={data.activities as any} onChange={reload} />
        </TabsContent>

        <TabsContent value="indicators" className="mt-4">
          {data.indicators.length === 0 ? <Empty label="Sem indicadores vinculados" /> : (
            <div className="space-y-2">{data.indicators.map((i: any) => (
              <Card key={i.id} className="p-3"><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.unit} · meta {i.target ?? "—"}</p></Card>
            ))}</div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <Card className="p-3 mb-3">
            <Button size="sm" onClick={async () => {
              const title = prompt("Título do plano de ação:");
              if (!title) return;
              try {
                await saveActionPlan({ data: { title, company_id: data.process.company_id, process_id: id } });
                toast.success("Plano criado"); reload();
              } catch (e: any) { toast.error(e?.message); }
            }}><Plus className="h-4 w-4 mr-1" /> Novo plano</Button>
          </Card>
          {data.actionPlans.length === 0 ? <Empty label="Sem planos de ação" /> : (
            <div className="space-y-2">{data.actionPlans.map((p: any) => (
              <Card key={p.id} className="p-3"><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.status} · {p.priority}</p></Card>
            ))}</div>
          )}
        </TabsContent>

        <TabsContent value="crono" className="mt-4">
          {data.cronoanalysis.length === 0 ? <Empty label="Sem sessões de cronoanálise" /> : (
            <div className="space-y-2">{data.cronoanalysis.map((c: any) => (
              <Link key={c.id} to="/cronoanalise/$id" params={{ id: c.id }} className="block">
                <Card className="p-3 hover:bg-secondary">
                  <p className="font-medium">{c.production_line || "Sessão"} · {c.product || "—"}</p>
                  <p className="text-xs text-muted-foreground">{c.observation_date}</p>
                </Card>
              </Link>
            ))}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
function Empty({ label }: { label: string }) {
  return <Card className="p-6 text-center text-sm text-muted-foreground">{label}</Card>;
}

function InfoMapEditor({ processId, items, activities, onChange }: { processId: string; items: any[]; activities: any[]; onChange: () => void }) {
  async function add() {
    await saveInformationItem({ data: { process_id: processId } });
    onChange();
  }
  async function update(it: any, patch: any) {
    await saveInformationItem({ data: { ...it, ...patch } });
  }
  async function remove(id: string) {
    await deleteInformationItem({ data: { id } });
    onChange();
  }
  return (
    <div className="space-y-2">
      <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Item</Button>
      {items.length === 0 ? <Empty label="Sem itens. Adicione fluxos de informação." /> : items.map((it) => (
        <Card key={it.id} className="p-3 grid sm:grid-cols-3 gap-2 text-sm">
          <Input placeholder="Origem" defaultValue={it.origin} onBlur={(e) => update(it, { origin: e.target.value })} />
          <Input placeholder="Destino" defaultValue={it.destination} onBlur={(e) => update(it, { destination: e.target.value })} />
          <Input placeholder="Meio (email, ERP…)" defaultValue={it.medium} onBlur={(e) => update(it, { medium: e.target.value })} />
          <Input placeholder="Responsável" defaultValue={it.responsible} onBlur={(e) => update(it, { responsible: e.target.value })} />
          <Input placeholder="Documento" defaultValue={it.document} onBlur={(e) => update(it, { document: e.target.value })} />
          <div className="flex items-center gap-2">
            <label className="text-xs flex items-center gap-1.5">
              <input type="checkbox" defaultChecked={it.loss_risk} onChange={(e) => update(it, { loss_risk: e.target.checked })} />
              Risco de perda
            </label>
            <Button size="icon" variant="ghost" className="ml-auto" onClick={() => remove(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function DecisionMapEditor({ processId, items, activities, onChange }: { processId: string; items: any[]; activities: any[]; onChange: () => void }) {
  async function add() { await saveDecisionItem({ data: { process_id: processId } }); onChange(); }
  async function update(it: any, patch: any) { await saveDecisionItem({ data: { ...it, ...patch } }); }
  async function remove(id: string) { await deleteDecisionItem({ data: { id } }); onChange(); }
  return (
    <div className="space-y-2">
      <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Item</Button>
      {items.length === 0 ? <Empty label="Sem decisões mapeadas." /> : items.map((it) => (
        <Card key={it.id} className="p-3 grid sm:grid-cols-2 gap-2 text-sm">
          <Input placeholder="Decisor" defaultValue={it.decider} onBlur={(e) => update(it, { decider: e.target.value })} />
          <Input placeholder="Decisão" defaultValue={it.decision} onBlur={(e) => update(it, { decision: e.target.value })} />
          <Input placeholder="Atraso reportado" defaultValue={it.reported_delay} onBlur={(e) => update(it, { reported_delay: e.target.value })} />
          <div className="flex items-center gap-2">
            <label className="text-xs flex items-center gap-1.5">
              <input type="checkbox" defaultChecked={it.approval_required} onChange={(e) => update(it, { approval_required: e.target.checked })} />
              Requer aprovação
            </label>
            <Button size="icon" variant="ghost" className="ml-auto" onClick={() => remove(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
