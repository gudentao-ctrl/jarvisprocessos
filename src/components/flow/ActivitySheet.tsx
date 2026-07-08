import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, ArrowUp, ArrowDown, GitBranch, Copy, X } from "lucide-react";
import { toast } from "sonner";
import {
  saveFlowActivity,
  deleteFlowActivity,
  addActivityRelative,
  duplicateActivity,
  saveConnection,
  deleteConnection,
  saveDecisionQuestion,
} from "@/lib/flow.functions";
import type { FlowActivity, FlowConnection, FlowDecision } from "./FlowEditor";

const ACTIVITY_TYPES = [
  { value: "task", label: "Atividade" },
  { value: "start", label: "Início" },
  { value: "end", label: "Fim" },
  { value: "decision", label: "Decisão" },
  { value: "wait", label: "Espera" },
  { value: "approval", label: "Aprovação" },
  { value: "info_in", label: "Info entrada" },
  { value: "info_out", label: "Info saída" },
];

const CONNECTION_TYPES = [
  { value: "sequential", label: "Sequencial" },
  { value: "decision", label: "Decisão" },
  { value: "parallel", label: "Paralela" },
  { value: "return", label: "Retorno" },
  { value: "subprocess", label: "Subprocesso" },
];

export function ActivitySheet({
  activity,
  processId,
  activities,
  connections,
  decisions,
  onClose,
  onChange,
}: {
  activity: FlowActivity & { [key: string]: any };
  processId: string;
  activities: FlowActivity[];
  connections: FlowConnection[];
  decisions: FlowDecision[];
  onClose: () => void;
  onChange: () => void;
}) {
  const [form, setForm] = useState({
    title: activity.title ?? "",
    type: activity.type ?? "task",
    description: (activity as any).description ?? "",
    responsible: (activity as any).responsible ?? "",
    area: (activity as any).area ?? "",
    time_minutes: (activity as any).time_minutes ?? 0,
    inputs: (activity as any).inputs ?? "",
    outputs: (activity as any).outputs ?? "",
    documents: ((activity as any).documents ?? []).join(", "),
    systems: ((activity as any).systems ?? []).join(", "),
    problems: (activity as any).problems ?? "",
    improvements: (activity as any).improvements ?? "",
    notes: (activity as any).notes ?? "",
    interview_snippet: (activity as any).interview_snippet ?? "",
  });

  const decision = decisions.find((d) => d.activity_id === activity.id);
  const [question, setQuestion] = useState(decision?.question ?? "");

  const incoming = connections.filter((c) => c.to_activity_id === activity.id);
  const outgoing = connections.filter((c) => c.from_activity_id === activity.id);

  async function save() {
    try {
      await saveFlowActivity({
        data: {
          id: activity.id,
          process_id: processId,
          title: form.title,
          type: form.type as any,
          description: form.description,
          responsible: form.responsible,
          area: form.area,
          time_minutes: Number(form.time_minutes) || 0,
          inputs: form.inputs,
          outputs: form.outputs,
          documents: form.documents.split(",").map((s: string) => s.trim()).filter(Boolean),
          systems: form.systems.split(",").map((s: string) => s.trim()).filter(Boolean),
          problems: form.problems,
          improvements: form.improvements,
          notes: form.notes,
          interview_snippet: form.interview_snippet,
        },
      });
      if (form.type === "decision" && question !== decision?.question) {
        await saveDecisionQuestion({ data: { activity_id: activity.id, question } });
      }
      toast.success("Salvo");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    }
  }

  async function remove() {
    if (!confirm("Excluir esta atividade? Conexões serão removidas.")) return;
    try {
      await deleteFlowActivity({ data: { id: activity.id } });
      toast.success("Excluída");
      onClose();
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  async function addRel(mode: "before" | "after" | "parallel") {
    try {
      await addActivityRelative({
        data: { process_id: processId, relative_to: activity.id, mode, title: "Nova atividade", type: "task" },
      });
      toast.success("Adicionada");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  async function duplicate() {
    try {
      await duplicateActivity({ data: { id: activity.id } });
      toast.success("Duplicada");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="truncate">{form.title || "Atividade"}</DrawerTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4">
          <Tabs defaultValue="dados">
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="conexoes">Conexões ({incoming.length + outgoing.length})</TabsTrigger>
              <TabsTrigger value="extras">Extras</TabsTrigger>
              <TabsTrigger value="acoes">Ações</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-3 mt-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tempo (min)</Label>
                  <Input type="number" value={form.time_minutes} onChange={(e) => setForm({ ...form, time_minutes: e.target.value as any })} />
                </div>
              </div>

              {form.type === "decision" && (
                <div>
                  <Label>Pergunta da decisão</Label>
                  <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex: Produto aprovado?" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Responsável</Label>
                  <Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
                </div>
                <div>
                  <Label>Área</Label>
                  <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Entradas</Label>
                  <Textarea rows={2} value={form.inputs} onChange={(e) => setForm({ ...form, inputs: e.target.value })} />
                </div>
                <div>
                  <Label>Saídas</Label>
                  <Textarea rows={2} value={form.outputs} onChange={(e) => setForm({ ...form, outputs: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Documentos (separados por vírgula)</Label>
                  <Input value={form.documents} onChange={(e) => setForm({ ...form, documents: e.target.value })} />
                </div>
                <div>
                  <Label>Sistemas (separados por vírgula)</Label>
                  <Input value={form.systems} onChange={(e) => setForm({ ...form, systems: e.target.value })} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="conexoes" className="space-y-3 mt-3">
              <ConnectionsPanel
                label="Entradas"
                connections={incoming}
                activities={activities}
                otherEnd="from_activity_id"
                onChange={onChange}
              />
              <ConnectionsPanel
                label="Saídas"
                connections={outgoing}
                activities={activities}
                otherEnd="to_activity_id"
                onChange={onChange}
              />
              <AddConnection
                processId={processId}
                activityId={activity.id}
                activities={activities.filter((a) => a.id !== activity.id)}
                isDecision={form.type === "decision"}
                onChange={onChange}
              />
            </TabsContent>

            <TabsContent value="extras" className="space-y-3 mt-3">
              <div>
                <Label>Problemas</Label>
                <Textarea rows={2} value={form.problems} onChange={(e) => setForm({ ...form, problems: e.target.value })} />
              </div>
              <div>
                <Label>Melhorias</Label>
                <Textarea rows={2} value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div>
                <Label>Trecho da entrevista</Label>
                <Textarea rows={3} value={form.interview_snippet} onChange={(e) => setForm({ ...form, interview_snippet: e.target.value })} />
              </div>
            </TabsContent>

            <TabsContent value="acoes" className="space-y-2 mt-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => addRel("before")}>
                <ArrowUp className="h-4 w-4 mr-2" /> Adicionar antes
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => addRel("after")}>
                <ArrowDown className="h-4 w-4 mr-2" /> Adicionar depois
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => addRel("parallel")}>
                <GitBranch className="h-4 w-4 mr-2" /> Adicionar em paralelo
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={duplicate}>
                <Copy className="h-4 w-4 mr-2" /> Duplicar
              </Button>
              <Button variant="destructive" className="w-full justify-start" onClick={remove}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t p-3 flex gap-2 bg-background">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={save}>Salvar</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ConnectionsPanel({
  label,
  connections,
  activities,
  otherEnd,
  onChange,
}: {
  label: string;
  connections: FlowConnection[];
  activities: FlowActivity[];
  otherEnd: "from_activity_id" | "to_activity_id";
  onChange: () => void;
}) {
  async function updateType(id: string, type: string) {
    try {
      const c = connections.find((x) => x.id === id);
      if (!c) return;
      await saveConnection({
        data: {
          id,
          process_id: (c as any).process_id,
          from_activity_id: c.from_activity_id,
          to_activity_id: c.to_activity_id,
          type: type as any,
          label: c.label,
        },
      });
      onChange();
    } catch (e: any) { toast.error(e?.message); }
  }
  async function updateLabel(id: string, labelValue: string) {
    try {
      const c = connections.find((x) => x.id === id);
      if (!c) return;
      await saveConnection({
        data: {
          id,
          process_id: (c as any).process_id,
          from_activity_id: c.from_activity_id,
          to_activity_id: c.to_activity_id,
          type: c.type,
          label: labelValue,
        },
      });
    } catch (e: any) { toast.error(e?.message); }
  }
  async function remove(id: string) {
    try { await deleteConnection({ data: { id } }); onChange(); } catch (e: any) { toast.error(e?.message); }
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{label}</p>
      {connections.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhuma</p>
      ) : (
        <div className="space-y-1.5">
          {connections.map((c) => {
            const other = activities.find((a) => a.id === c[otherEnd]);
            return (
              <Card key={c.id} className="p-2 flex items-center gap-2">
                <span className="text-xs flex-1 truncate">{other?.title ?? "?"}</span>
                <Select value={c.type} onValueChange={(v) => updateType(c.id, v)}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONNECTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  className="h-7 w-24 text-xs"
                  placeholder="rótulo"
                  defaultValue={c.label}
                  onBlur={(e) => e.target.value !== c.label && updateLabel(c.id, e.target.value)}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(c.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddConnection({
  processId,
  activityId,
  activities,
  isDecision,
  onChange,
}: {
  processId: string;
  activityId: string;
  activities: FlowActivity[];
  isDecision: boolean;
  onChange: () => void;
}) {
  const [target, setTarget] = useState("");
  const [type, setType] = useState(isDecision ? "decision" : "sequential");
  const [label, setLabel] = useState("");

  async function add() {
    if (!target) return toast.error("Selecione o destino");
    try {
      await saveConnection({
        data: {
          process_id: processId,
          from_activity_id: activityId,
          to_activity_id: target,
          type: type as any,
          label,
        },
      });
      toast.success("Conexão criada");
      setTarget(""); setLabel("");
      onChange();
    } catch (e: any) { toast.error(e?.message); }
  }

  return (
    <Card className="p-2 border-dashed space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase">Nova conexão (saída)</p>
      <div className="grid grid-cols-2 gap-2">
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Destino" /></SelectTrigger>
          <SelectContent>
            {activities.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONNECTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Input
          className="h-8 text-xs"
          placeholder={type === "decision" ? "Ex: Sim / Não / Retrabalho" : "Rótulo (opcional)"}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    </Card>
  );
}
