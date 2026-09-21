import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLeads,
  saveLead,
  convertLeadToCompany,
  deleteLead,
  addLeadActivity,
  getCrmAlerts,
  dismissAlertToday,
  CRM_STAGES,
  CONTRACT_TYPES,
  LEAD_ORIGINS,
  LEAD_CLASSIFICATIONS,
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
import { Handshake, Plus, Trash2, Bell, Flame, Snowflake, User, MessageSquarePlus, Building2 } from "lucide-react";
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
  origem: string;
  quem_indicou: string;
  notes: string;
  first_contact_date: string;
  responsible: string;
  stage: string;
  classification: "quente" | "medio" | "frio";
  is_hot: boolean;
  next_action_date: string;
  contract_type: string;
  payment_day: string;
  payment_due_date: string;
  hourly_rate: string;
  contract_total: string;
  total_project_hours: string;
  cnpj: string;
  whatsapp: string;
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
  origem: "",
  quem_indicou: "",
  notes: "",
  first_contact_date: today(),
  responsible: "",
  stage: "nao_iniciado",
  classification: "frio",
  is_hot: false,
  next_action_date: "",
  contract_type: "",
  payment_day: "",
  payment_due_date: "",
  hourly_rate: "",
  contract_total: "",
  total_project_hours: "",
  cnpj: "",
  whatsapp: "",
  start_date: "",
  end_date: "",
});

function LeadClassificationBadge({ classification, isHot }: { classification?: string; isHot?: boolean }) {
  const c = classification || (isHot ? "quente" : "frio");
  if (c === "quente") {
    return (
      <span
        title="Classificação: Quente"
        className="inline-flex items-center gap-0.5 rounded-full bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 shrink-0 whitespace-nowrap"
      >
        <Flame className="h-3 w-3 fill-red-500 text-red-600 animate-pulse" />
        <span>Quente</span>
      </span>
    );
  }
  if (c === "medio") {
    return (
      <span
        title="Classificação: Médio"
        className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0 whitespace-nowrap"
      >
        <Flame className="h-3 w-3 text-amber-600" />
        <span>Médio</span>
      </span>
    );
  }
  return (
    <span
      title="Classificação: Frio"
      className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shrink-0 whitespace-nowrap"
    >
      <Snowflake className="h-3 w-3 text-sky-600" />
      <span>Frio</span>
    </span>
  );
}

function CrmPage() {
  const qc = useQueryClient();
  const load = useServerFn(listLeads);
  const loadAlerts = useServerFn(getCrmAlerts);
  const save = useServerFn(saveLead);
  const convert = useServerFn(convertLeadToCompany);
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
          source: form.origem || form.source,
          origem: form.origem || form.source,
          quem_indicou: form.quem_indicou,
          notes: form.notes,
          responsible: form.responsible,
          stage: form.stage as any,
          classification: form.classification,
          is_hot: form.classification === "quente",
          first_contact_date: form.first_contact_date || null,
          next_action_date: form.next_action_date || null,
          contract_type: (form.contract_type || null) as any,
          payment_day: form.payment_day ? Number(form.payment_day) : null,
          payment_due_date: form.payment_due_date || null,
          hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
          contract_total: form.contract_total ? Number(form.contract_total) : null,
          total_project_hours: form.total_project_hours ? Number(form.total_project_hours) : null,
          cnpj: form.cnpj,
          whatsapp: form.whatsapp,
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

  const convertM = useMutation({
    mutationFn: (leadId: string) => convert({ data: { lead_id: leadId } }),
    onSuccess: () => {
      toast.success("Empresa ativa criada e vinculada ao lead");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar empresa"),
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
  const activeCompanies = data?.companies?.filter((company: any) => company.is_active) ?? [];
  const canViewFinance = !!data?.canViewFinance;

  const byStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of CRM_STAGES) map[s.value] = [];
    for (const l of leads) (map[l.stage] ??= []).push(l);
    return map;
  }, [leads]);

  const openEdit = (l: any) => {
    const classif = (l.classification as "quente" | "medio" | "frio") || (l.is_hot ? "quente" : "frio");
    setForm({
      id: l.id,
      company_name: l.company_name ?? "",
      contact_name: l.contact_name ?? "",
      contact_role: l.contact_role ?? "",
      phone: l.phone ?? "",
      email: l.email ?? "",
      source: l.source ?? "",
      origem: l.origem || l.source || "",
      quem_indicou: l.quem_indicou ?? "",
      notes: l.notes ?? "",
      first_contact_date: l.first_contact_date ?? "",
      responsible: l.responsible ?? "",
      stage: l.stage ?? "nao_iniciado",
      classification: classif,
      is_hot: classif === "quente",
      next_action_date: l.next_action_date ?? "",
      contract_type: l.contract_type ?? "",
      payment_day: l.payment_day != null ? String(l.payment_day) : "",
      payment_due_date: l.payment_due_date ?? "",
      hourly_rate: l.hourly_rate != null ? String(l.hourly_rate) : "",
      contract_total: l.contract_total != null ? String(l.contract_total) : "",
      total_project_hours: l.total_project_hours != null ? String(l.total_project_hours) : "",
      cnpj: l.cnpj ?? "",
      whatsapp: l.whatsapp || l.phone || "",
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
          <TabsTrigger value="empresas">Empresas ativas</TabsTrigger>
        </TabsList>

        <TabsContent value="funil" className="space-y-3 pt-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && leads.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhum lead cadastrado ainda.
            </Card>
          )}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {CRM_STAGES.map((s) => (
              <div key={s.value} className="space-y-2">
                <div className="flex items-center justify-between rounded-md bg-muted px-2.5 py-2">
                  <span className="text-xs font-bold text-foreground">{s.label}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                    {byStage[s.value]?.length ?? 0}
                  </Badge>
                </div>
                {(byStage[s.value] ?? []).map((l: any) => (
                  <Card key={l.id} className="space-y-2.5 p-3 hover:shadow-md transition-shadow">
                    {/* 7. Campo de estágio do lead na parte superior do card + 4. Classificação visual */}
                    <div className="flex items-center justify-between gap-1 flex-wrap min-w-0 border-b pb-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold uppercase tracking-wider bg-primary/5 text-primary border-primary/20"
                      >
                        {stageLabel(l.stage)}
                      </Badge>
                      <LeadClassificationBadge classification={l.classification} isHot={l.is_hot} />
                    </div>

                    {/* Empresa */}
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="min-w-0 flex-1 text-left text-sm font-bold text-foreground hover:text-primary hover:underline transition-colors"
                        onClick={() => openEdit(l)}
                      >
                        {l.company_name}
                      </button>
                    </div>

                    {/* 5. Nome do contato e NÃO o responsável cadastrado */}
                    <div className="flex items-center gap-1.5 text-xs text-foreground/90 font-medium">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {[l.contact_name, l.contact_role].filter(Boolean).join(" · ") || "Sem contato informado"}
                      </span>
                    </div>

                    {/* Origem e quem indicou */}
                    {(l.origem || l.source) && (
                      <div className="text-[11px] text-muted-foreground">
                        <span>Origem: {l.origem || l.source}</span>
                        {((l.origem === "Indicação" || l.source === "Indicação") && l.quem_indicou) && (
                          <span className="font-medium text-foreground"> · Indicado por {l.quem_indicou}</span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {l.next_action_date && (
                        <Badge variant="outline" className="text-[10px]">
                          Retorno {fmtDate(l.next_action_date)}
                        </Badge>
                      )}
                    </div>

                    {/* 6. No card de fechamento em dados do contrato: cnpj, nome do cliente, whatsapp, email, horas total do projeto */}
                    {l.stage === "fechamento" && (
                      <div className="rounded-md border bg-muted/40 p-2.5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-semibold text-foreground border-b pb-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Dados do Contrato</span>
                          {l.contract_type && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {contractLabel(l.contract_type)}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-[11px]">
                          <div>
                            <span className="text-muted-foreground">Cliente: </span>
                            <span className="font-semibold text-foreground">{l.company_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CNPJ: </span>
                            <span className="font-mono">{l.cnpj || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="text-muted-foreground">WhatsApp: </span>
                              <span>{l.whatsapp || l.phone || "—"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">E-mail: </span>
                              <span className="truncate">{l.email || "—"}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total de horas do projeto: </span>
                            <span className="font-semibold text-primary">
                              {l.total_project_hours != null && l.total_project_hours !== "" ? `${l.total_project_hours}h` : "—"}
                            </span>
                          </div>
                          {canViewFinance && (l.hourly_rate != null || l.contract_total != null) && (
                            <div className="text-muted-foreground pt-0.5 border-t mt-0.5">
                              {l.hourly_rate != null && <span>{brl(l.hourly_rate)}/h</span>}
                              {l.hourly_rate != null && l.contract_total != null && <span> · </span>}
                              {l.contract_total != null && <span>Total {brl(l.contract_total)}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {l.stage === "fechamento" && !l.converted_company_id && (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={convertM.isPending}
                        onClick={() => confirm(`Criar ${l.company_name} como empresa ativa?`) && convertM.mutate(l.id)}
                      >
                        <Building2 className="mr-1 h-3.5 w-3.5" /> Criar empresa ativa
                      </Button>
                    )}
                    {l.converted_company_id && (
                      <Badge variant="outline" className="text-[10px]">Empresa ativa vinculada</Badge>
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
        <TabsContent value="empresas" className="pt-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeCompanies.map((company: any) => (
              <Card key={company.id} className="flex items-center gap-3 p-4">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">{company.name}</p>
                  <p className="text-xs text-muted-foreground">Empresa ativa</p>
                </div>
              </Card>
            ))}
            {activeCompanies.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma empresa ativa.</Card>
            )}
          </div>
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
              <Select
                value={form.origem || undefined}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    origem: v,
                    source: v,
                    quem_indicou: v === "Indicação" ? form.quem_indicou : "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_ORIGINS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.origem === "Indicação" && (
              <div>
                <Label>Quem indicou? *</Label>
                <Input
                  placeholder="Nome de quem indicou"
                  value={form.quem_indicou}
                  onChange={(e) => setForm({ ...form, quem_indicou: e.target.value })}
                />
              </div>
            )}
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
            <div className="sm:col-span-2">
              <Label className="block mb-1.5 font-medium">Classificação do Lead</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, classification: "quente", is_hot: true })}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold transition-all ${
                    form.classification === "quente"
                      ? "border-red-500 bg-red-50 text-red-700 shadow-sm dark:bg-red-950/50 dark:text-red-300"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Flame className="h-4 w-4 text-red-600 fill-red-500 shrink-0 animate-pulse" />
                  <span>Quente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, classification: "medio", is_hot: false })}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold transition-all ${
                    form.classification === "medio"
                      ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-950/50 dark:text-amber-300"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Médio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, classification: "frio", is_hot: false })}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold transition-all ${
                    form.classification === "frio"
                      ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm dark:bg-sky-950/50 dark:text-sky-300"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Snowflake className="h-4 w-4 text-sky-500 shrink-0" />
                  <span>Frio</span>
                </button>
              </div>
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
                  <Label>Nome do cliente</Label>
                  <Input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <Label>CNPJ do cliente</Label>
                  <Input
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div>
                  <Label>Total de horas do projeto</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={form.total_project_hours}
                    onChange={(e) => setForm({ ...form, total_project_hours: e.target.value })}
                    placeholder="Ex: 80"
                  />
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
                {canViewFinance && (
                  <>
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
                      <Label>Data de pagamento contratada</Label>
                      <Input
                        type="date"
                        value={form.payment_due_date}
                        onChange={(e) => setForm({ ...form, payment_due_date: e.target.value })}
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
                  </>
                )}
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
