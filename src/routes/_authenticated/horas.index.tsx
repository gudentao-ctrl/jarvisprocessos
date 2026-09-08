import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listWorkHours,
  saveWorkHours,
  deleteWorkHours,
  hoursBetween,
  ACTIVITY_TYPES,
} from "@/lib/work-hours.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { getMe } from "@/lib/access.functions";
import { PERIOD_OPTIONS, periodRange, type PeriodValue } from "@/lib/period-range";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Clock, Pencil, Check, Lock, Car, Wrench } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/horas/")({
  component: HorasPage,
  head: () => ({
    meta: [
      { title: "Registro de horas | JARVIS" },
      {
        name: "description",
        content:
          "Registro de horas de atendimento por empresa, com deslocamentos, ferramentas e filtros por período.",
      },
      { property: "og:title", content: "Registro de horas | JARVIS" },
      {
        property: "og:description",
        content: "Apontamento de horas do consultor por empresa e período.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = {
  id?: string;
  company_id: string | null;
  responsible: string;
  activity_type: string;
  work_date: string;
  start_time: string;
  end_time: string;
  description: string;
  notes: string;
  hasExpense: boolean;
  expenseDescription: string;
  expenseAmount: number;
  toolDescription: string;
  toolQuantity: number;
  toolAmount: number;
};

const empty = (): Row => ({
  company_id: null,
  responsible: "",
  activity_type: "consultoria",
  work_date: new Date().toISOString().slice(0, 10),
  start_time: "08:00",
  end_time: "12:00",
  description: "",
  notes: "",
  hasExpense: false,
  expenseDescription: "",
  expenseAmount: 0,
  toolDescription: "",
  toolQuantity: 1,
  toolAmount: 0,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function fmtDuration(h: number) {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function typeLabel(v: string) {
  return ACTIVITY_TYPES.find((t) => t.value === v)?.label ?? v;
}

function HorasPage() {
  const qc = useQueryClient();
  const [companyFilter, setCompanyFilter] = useState<string>("__all");
  const [typeFilter, setTypeFilter] = useState<string>("__all");
  const [period, setPeriod] = useState<PeriodValue>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const list = useServerFn(listWorkHours);
  const comps = useServerFn(listCompanies);
  const meFn = useServerFn(getMe);
  const save = useServerFn(saveWorkHours);
  const del = useServerFn(deleteWorkHours);

  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => comps() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const activeCompanies = useMemo(
    () => (companies as any[]).filter((c) => c.is_active !== false),
    [companies],
  );
  const myName = me?.fullName || me?.email || "";

  const range = useMemo(
    () => periodRange(period, { from: customFrom, to: customTo }),
    [period, customFrom, customTo],
  );

  const { data: rows = [] } = useQuery({
    queryKey: ["work-hours", companyFilter, typeFilter, range.from, range.to],
    queryFn: () =>
      list({
        data: {
          ...(companyFilter !== "__all" ? { company_id: companyFilter } : {}),
          ...(typeFilter !== "__all" ? { activity_type: typeFilter } : {}),
          ...(range.from ? { from: range.from } : {}),
          ...(range.to ? { to: range.to } : {}),
          mine: true,
        },
      }),
  });

  const saveMut = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-hours"] });
      setOpen(false);
      setEditing(null);
      toast.success("Lançamento salvo");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-hours"] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  useEffect(() => {
    if (!editing && open) setEditing({ ...empty(), responsible: myName });
  }, [open, editing, myName]);

  const duration = useMemo(() => {
    if (!editing?.start_time || !editing?.end_time) return 0;
    return hoursBetween(editing.start_time, editing.end_time);
  }, [editing?.start_time, editing?.end_time]);

  function openNew() {
    setEditing({
      ...empty(),
      responsible: myName,
      company_id: companyFilter !== "__all" ? companyFilter : null,
    });
    setOpen(true);
  }

  function openEdit(r: any) {
    if (r.billing_status === "faturado") {
      toast.error("Lançamento faturado não pode ser editado.");
      return;
    }
    const exp = r.work_hour_expenses?.[0];
    const tool = r.work_hour_tools?.[0];
    setEditing({
      id: r.id,
      company_id: r.company_id,
      responsible: r.responsible || myName,
      activity_type: r.activity_type,
      work_date: r.work_date,
      start_time: (r.start_time ?? "08:00").slice(0, 5),
      end_time: (r.end_time ?? "12:00").slice(0, 5),
      description: r.description ?? "",
      notes: r.notes ?? "",
      hasExpense: !!exp,
      expenseDescription: exp?.description ?? "",
      expenseAmount: Number(exp?.amount ?? 0),
      toolDescription: tool?.description ?? "",
      toolQuantity: Number(tool?.quantity ?? 1),
      toolAmount: Number(tool?.amount ?? 0),
    });
    setOpen(true);
  }

  function submit() {
    if (!editing) return;
    if (!editing.company_id) return toast.error("Selecione a empresa");
    if (!editing.description.trim()) return toast.error("Descreva o atendimento");
    if (duration <= 0) return toast.error("Informe entrada e saída válidas");
    if (editing.hasExpense && (!editing.expenseDescription.trim() || editing.expenseAmount <= 0))
      return toast.error("Preencha descrição e valor da despesa");
    if (editing.activity_type === "ferramenta" && !editing.toolDescription.trim())
      return toast.error("Descreva a ferramenta utilizada");

    saveMut.mutate({
      id: editing.id,
      company_id: editing.company_id,
      responsible: editing.responsible || myName || "—",
      activity_type: editing.activity_type,
      work_date: editing.work_date,
      start_time: editing.start_time,
      end_time: editing.end_time,
      hours: duration,
      description: editing.description,
      notes: editing.notes,
      expense: editing.hasExpense
        ? { description: editing.expenseDescription, amount: editing.expenseAmount }
        : null,
      tool:
        editing.activity_type === "ferramenta"
          ? {
              description: editing.toolDescription,
              quantity: editing.toolQuantity,
              amount: editing.toolAmount,
            }
          : null,
    });
  }

  const total = rows.reduce((s: number, r: any) => s + Number(r.hours ?? 0), 0);
  const totalExpenses = rows.reduce(
    (s: number, r: any) =>
      s + (r.work_hour_expenses ?? []).reduce((x: number, e: any) => x + Number(e.amount ?? 0), 0),
    0,
  );
  const totalTools = rows.reduce(
    (s: number, r: any) =>
      s + (r.work_hour_tools ?? []).reduce((x: number, e: any) => x + Number(e.amount ?? 0), 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Horas Trabalhadas</h1>
          <p className="text-xs text-muted-foreground">
            Seus atendimentos{myName ? ` — ${myName}` : ""}
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openNew} className="h-11 shrink-0">
              <Plus className="mr-1 h-4 w-4" /> Registrar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Editar" : "Registrar"} atendimento</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <Label>Empresa *</Label>
                  <Select
                    value={editing.company_id ?? ""}
                    onValueChange={(v) => setEditing({ ...editing, company_id: v || null })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCompanies.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3 sm:col-span-1">
                    <Label>Data</Label>
                    <Input
                      className="h-11"
                      type="date"
                      value={editing.work_date}
                      onChange={(e) => setEditing({ ...editing, work_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Entrada</Label>
                    <Input
                      className="h-11"
                      type="time"
                      value={editing.start_time}
                      onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Saída</Label>
                    <Input
                      className="h-11"
                      type="time"
                      value={editing.end_time}
                      onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <div className="flex h-11 items-center justify-center rounded-md border bg-muted/50 font-bold tabular-nums">
                      {fmtDuration(duration)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label>Consultor</Label>
                    <Input className="h-11" value={editing.responsible} readOnly disabled />
                  </div>
                  <div>
                    <Label>Tipo de evento</Label>
                    <Select
                      value={editing.activity_type}
                      onValueChange={(v) => setEditing({ ...editing, activity_type: v })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Descrição do evento *</Label>
                  <Textarea
                    rows={2}
                    placeholder="Ex.: Mapeamento do processo de compras com a equipe responsável."
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>

                {editing.activity_type === "ferramenta" && (
                  <Card className="space-y-2 border-primary/30 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold">
                      <Wrench className="h-3.5 w-3.5" /> Ferramenta aplicada
                    </p>
                    <Input
                      className="h-11"
                      placeholder="Descrição (ex.: Análise de perfil comportamental)"
                      value={editing.toolDescription}
                      onChange={(e) => setEditing({ ...editing, toolDescription: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          className="h-11"
                          type="number"
                          min="0"
                          value={editing.toolQuantity}
                          onChange={(e) =>
                            setEditing({ ...editing, toolQuantity: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Valor total (R$)</Label>
                        <Input
                          className="h-11"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editing.toolAmount}
                          onChange={(e) =>
                            setEditing({ ...editing, toolAmount: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <Car className="h-4 w-4" /> Houve gasto com deslocamento?
                    </Label>
                    <Switch
                      checked={editing.hasExpense}
                      onCheckedChange={(v) => setEditing({ ...editing, hasExpense: v })}
                    />
                  </div>
                  {editing.hasExpense && (
                    <div className="space-y-2">
                      <Input
                        className="h-11"
                        placeholder="Descrição (ex.: Combustível Londrina → cliente)"
                        value={editing.expenseDescription}
                        onChange={(e) =>
                          setEditing({ ...editing, expenseDescription: e.target.value })
                        }
                      />
                      <Input
                        className="h-11"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Valor (R$)"
                        value={editing.expenseAmount}
                        onChange={(e) =>
                          setEditing({ ...editing, expenseAmount: Number(e.target.value) })
                        }
                      />
                    </div>
                  )}
                </Card>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    value={editing.notes}
                    onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  />
                </div>

                <Button onClick={submit} className="min-h-11 w-full" disabled={saveMut.isPending}>
                  <Check className="mr-1 h-4 w-4" /> {saveMut.isPending ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card className="grid gap-2 p-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Empresa</Label>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as empresas ativas</SelectItem>
              {activeCompanies.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Período</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodValue)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo de evento</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os tipos</SelectItem>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {period === "personalizado" && (
          <>
            <div>
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                className="h-11"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                className="h-11"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Total de horas</p>
          <p className="text-2xl font-bold tabular-nums">{fmtDuration(total)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Registros</p>
          <p className="text-2xl font-bold tabular-nums">{rows.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Deslocamentos</p>
          <p className="text-lg font-bold tabular-nums">{brl(totalExpenses)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Ferramentas</p>
          <p className="text-lg font-bold tabular-nums">{brl(totalTools)}</p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum registro no período selecionado.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((r: any) => {
            const faturado = r.billing_status === "faturado";
            const exp = (r.work_hour_expenses ?? [])[0];
            const tool = (r.work_hour_tools ?? [])[0];
            return (
              <Card key={r.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {r.companies?.name ?? "Sem empresa"}
                    </p>
                    <p className="font-semibold">
                      <span className="tabular-nums">{fmtDuration(Number(r.hours))}</span> ·{" "}
                      {typeLabel(r.activity_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.work_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      {r.start_time && r.end_time
                        ? ` · ${String(r.start_time).slice(0, 5)}–${String(r.end_time).slice(0, 5)}`
                        : ""}
                    </p>
                    {r.description && <p className="mt-1 text-sm">{r.description}</p>}
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {faturado && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" /> Faturado
                        </Badge>
                      )}
                      {exp && (
                        <Badge variant="outline" className="gap-1">
                          <Car className="h-3 w-3" /> {brl(Number(exp.amount))}
                        </Badge>
                      )}
                      {tool && (
                        <Badge variant="outline" className="gap-1">
                          <Wrench className="h-3 w-3" /> {tool.quantity}× {brl(Number(tool.amount))}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" disabled={faturado} onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      disabled={faturado}
                      onClick={() => confirm("Excluir?") && delMut.mutate(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
