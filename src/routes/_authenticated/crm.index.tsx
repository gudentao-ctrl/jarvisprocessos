import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLeads,
  saveLead,
  deleteLead,
  addLeadActivity,
  getCrmAlerts,
  dismissAlertToday,
  CRM_STAGES,
  CONTRACT_TYPES,
  stageLabel,
  contractLabel,
} from "@/lib/crm.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Handshake, Plus, Trash2, Bell, Flame, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm/")({
  component: CrmPage,
  head: () => ({
    meta: [
      { title: "CRM de leads | JARVIS" },
      {
        name: "description",
        content:
          "Funil comercial da consultoria: leads por estágio, leads aquecidos, histórico de contatos e alertas de prospecção.",
      },
      { property: "og:title", content: "CRM de leads | JARVIS" },
      {
        property: "og:description",
        content: "Acompanhe leads por estágio, contatos e alertas comerciais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const brl = (n?: number | null) =>
  n == null ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "—");
const today = () => new Date().toISOString().slice(0, 10);

type LeadForm = {
  id?: string;
  company_name: string;
  contact_name: string;
  contact_role: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
  first_contact_date: string;
  responsible: string;
  stage: string;
  is_hot: boolean;
  next_action_date: string;
  contract_type: string;
  payment_day: string;
  hourly_rate: string;
  contract_total: string;
  start_date: string;
  end_date: string;
};

const emptyForm = (): LeadForm => ({
  company_name: "",
  contact_name: "",
  contact_role: "",
  phone: "",
  email: "",
  source: "",
  notes: "",
  first_contact_date: today(),
  responsible: "",
  stage: "nao_iniciado",
  is_hot: false,
  next_action_date: "",
  contract_type: "",
  payment_day: "",
  hourly_rate: "",
  contract_total: "",
  start_date: "",
  end_date: "",
});

function CrmPage() {
  const qc = useQueryClient();
  const load = useServerFn(listLeads);
  const loadAlerts = useServerFn(getCrmAlerts);
  const save = useServerFn(saveLead);
  const remove = useServerFn(deleteLead);
  const addAct = useServerFn(addLeadActivity);
  const dismiss = useServerFn(dismissAlertToday);

  const { data, isLoading } = useQuery({ queryKey: ["crm"], queryFn: () => load() });
  const { data: alerts } = useQuery({ queryKey: ["crm-alerts"], queryFn: () => loadAlerts() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LeadForm>(emptyForm());
  const [actLead, setActLead] = useState<string | null>(null);
  const [actForm, setActForm] = useState({ kind: "contato", description: "", occurred_at: today() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crm"] });
    qc.invalidateQueries({ queryKey: ["crm-alerts"] });
  };

  const saveM = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: form.id,
          company_name: form.company_name.trim(),
          contact_name: form.contact_name,
          contact_role: form.contact_role,
          phone: form.phone,
          email: form.email,
          source: form.source,
          notes: form.notes,
          responsible: form.responsible,
          stage: form.stage as any,
          is_hot: form.is_hot,
          first_contact_date: form.first_contact_date || null,
          next_action_date: form.next_action_date || null,
          contract_type: (form.contract_type || null) as any,
          payment_day: form.payment_day ? Number(form.payment_day) : null,
          hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
          contract_total: form.contract_total ? Number(form.contract_total) : null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        },
      }),
    onSuccess: () => {
      toast.success("Lead salvo");
      setOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const removeM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Lead excluído");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  const actM = useMutation({
    mutationFn: () => addAct({ data: { lead_id: actLead!, ...actForm } }),
    onSuccess: () => {
      toast.success("Contato registrado");
      setActLead(null);
      setActForm({ kind: "contato", description: "", occurred_at: today() });
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao registrar"),
  });

  const dismissM = useMutation({
    mutationFn: (key: string) => dismiss({ data: { key } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-alerts"] }),
  });

  const leads = data?.leads ?? [];
  const activities = data?.activities ?? [];

  const byStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of CRM_STAGES) map[s.value] = [];
    for (const l of leads) (map[l.stage] ??= []).push(l);
    return map;
  }, [leads]);

  const openEdit = (l: any) => {
    setForm({
      id: l.id,
      company_name: l.company_name ?? "",
      contact_name: l.contact_name ?? "",
      contact_role: l.contact_role ?? "",
      phone: l.phone ?? "",
      email: l.email ?? "",
      source: l.source ?? "",
      notes: l.notes ?? "",
      first_contact_date: l.first_contact_date ?? "",
      responsible: l.responsible ?? "",
      stage: l.stage ?? "nao_iniciado",
      is_hot: !!l.is_hot,
      next_action_date: l.next_action_date ?? "",
      contract_type: l.contract_type ?? "",
      payment_day: l.payment_day != null ? String(l.payment_day) : "",
      hourly_rate: l.hourly_rate != null ? String(l.hourly_rate) : "",
      contract_total: l.contract_total != null ? String(l.contract_total) : "",
      start_date: l.start_date ?? "",
      end_date: l.end_date ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Handshake className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">CRM</h1>
        <Button
          className="ml-auto"
          onClick={() => {
            setForm(emptyForm());
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Novo lead
        </Button>
      </div>

      <Tabs defaultValue="funil">
        <TabsList>
          <TabsTrigger value="funil">Funil</TabsTrigger>
          <TabsTrigger value="alertas">
            Alertas {alerts?.length ? `(${alerts.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funil" className="space-y-3 pt-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && leads.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhum lead cadastrado ainda.
            </Card>
          )}
          <div className="grid gap-3 lg:grid-cols-5">
            {CRM_STAGES.map((s) => (
              <div key={s.value} className="space-y-2">
                <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5">
                  <span className="text-xs font-semibold">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{byStage[s.value]?.length ?? 0}</span>
                </div>
                {(byStage[s.value] ?? []).map((l: any) => (
                  <Card key={l.id} className="space-y-2 p-3">
                    <div className="flex items-start gap-2">
                      <button
                        className="min-w-0 flex-1 text-left text-sm font-semibold hover:underline"
                        onClick={() => openEdit(l)}
                      >
                        {l.company_name}
                      </button>
                      {l.is_hot && <Flame className="h-4 w-4 shrink-0 text-destructive" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[l.contact_name, l.contact_role].filter(Boolean).join(" · ") || "Sem contato"}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {l.responsible && (
                        <Badge variant="secondary" className="text-[10px]">
                          {l.responsible}
                        </Badge>
                      )}
                      {l.next_action_date && (
                        <Badge variant="outline" className="text-[10px]">
                          Retorno {fmtDate(l.next_action_date)}
                        </Badge>
                      )}
                      {l.stage === "fechamento" && l.contract_type && (
                        <Badge className="text-[10px]">{contractLabel(l.contract_type)}</Badge>
                      )}
                    </div>
                    {l.stage === "fechamento" && (
                      <p className="text-[11px] text-muted-foreground">
                        {brl(l.hourly_rate)}/h · Total {brl(l.contract_total)}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Último contato: {fmtDate(l.last_contact_at ?? l.first_contact_date)}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setActLead(l.id)}
                      >
                        <MessageSquarePlus className="mr-1 h-3.5 w-3.5" /> Contato
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Excluir o lead ${l.company_name}?`)) removeM.mutate(l.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    {activities.filter((a: any) => a.lead_id === l.id).length > 0 && (
                      <div className="space-y-1 border-t pt-2">
                        {activities
                          .filter((a: any) => a.lead_id === l.id)
                          .slice(0, 3)
                          .map((a: any) => (
                            <p key={a.id} className="text-[11px] text-muted-foreground">
                              {fmtDate(a.occurred_at)} — {a.description || a.kind}
                            </p>
                          ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alertas" className="space-y-2 pt-3">
          {(alerts ?? []).length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhum alerta pendente hoje.
            </Card>
          )}
          {(alerts ?? []).map((a) => (
            <Card key={a.key} className="flex flex-wrap items-center gap-3 p-3">
              <Bell
                className={
                  a.severity === "critical"
                    ? "h-4 w-4 text-destructive"
                    : a.severity === "warning"
                      ? "h-4 w-4 text-amber-500"
                      : "h-4 w-4 text-muted-foreground"
                }
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.subtitle}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => dismissM.mutate(a.key)}>
                Dispensar hoje
              </Button>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar lead" : "Novo lead"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Empresa *</Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Nome do contato</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input
                value={form.contact_role}
                onChange={(e) => setForm({ ...form, contact_role: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Origem</Label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input
                value={form.responsible}
                onChange={(e) => setForm({ ...form, responsible: e.target.value })}
              />
            </div>
            <div>
              <Label>Data do primeiro contato</Label>
              <Input
                type="date"
                value={form.first_contact_date}
                onChange={(e) => setForm({ ...form, first_contact_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Próximo retorno</Label>
              <Input
                type="date"
                value={form.next_action_date}
                onChange={(e) => setForm({ ...form, next_action_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Estágio</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={form.is_hot}
                onCheckedChange={(v) => setForm({ ...form, is_hot: v })}
                id="hot"
              />
              <Label htmlFor="hot">Lead aquecido</Label>
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {form.stage === "fechamento" && (
              <>
                <div className="sm:col-span-2 border-t pt-3">
                  <p className="text-sm font-semibold">Dados do contrato</p>
                </div>
                <div>
                  <Label>Tipo de contrato</Label>
                  <Select
                    value={form.contract_type || undefined}
                    onValueChange={(v) => setForm({ ...form, contract_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dia de pagamento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.payment_day}
                    onChange={(e) => setForm({ ...form, payment_day: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valor/hora (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valor total do projeto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.contract_total}
                    onChange={(e) => setForm({ ...form, contract_total: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data de início</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data de término</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!form.company_name.trim() || saveM.isPending}
              onClick={() => saveM.mutate()}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actLead} onOpenChange={(v) => !v && setActLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={actForm.occurred_at}
                onChange={(e) => setActForm({ ...actForm, occurred_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={actForm.kind} onValueChange={(v) => setActForm({ ...actForm, kind: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contato">Contato</SelectItem>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="apresentacao">Apresentação</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={actForm.description}
                onChange={(e) => setActForm({ ...actForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActLead(null)}>
                Cancelar
              </Button>
              <Button disabled={actM.isPending} onClick={() => actM.mutate()}>
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">Estágios: {CRM_STAGES.map((s) => stageLabel(s.value)).join(" → ")}</p>
    </div>
  );
}
