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
import {
  Plus,
  Trash2,
  Clock,
  Pencil,
  Check,
  Lock,
  Car,
  Wrench,
  UtensilsCrossed,
  Milestone,
  CircleParking,
  Hotel,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/horas/")({
  component: HorasPage,
  head: () => ({
    meta: [
      { title: "Registro de horas | JARVIS" },
      {
        name: "description",
        content:
          "Registro de horas de atendimento por empresa, com despesas categorizadas, ferramentas e filtros por período.",
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

export const EXPENSE_CATEGORIES_CONFIG = [
  {
    key: "alimentacao",
    label: "Alimentação",
    icon: UtensilsCrossed,
    placeholder: "Ex.: Almoço durante visita ao cliente",
  },
  {
    key: "pedagio",
    label: "Pedágio",
    icon: Milestone,
    placeholder: "Ex.: Praça de pedágio BR-369",
  },
  {
    key: "deslocamento",
    label: "Deslocamento",
    icon: Car,
    placeholder: "Ex.: Combustível / Uber / Km rodado",
  },
  {
    key: "estacionamento",
    label: "Estacionamento",
    icon: CircleParking,
    placeholder: "Ex.: Estacionamento centro / aeroporto",
  },
  {
    key: "hospedagem",
    label: "Hospedagem",
    icon: Hotel,
    placeholder: "Ex.: Hotel / estadia",
  },
] as const;

type ExpenseCategoryItem = {
  amount: number;
  description: string;
};

type Row = {
  id?: string;
  company_id: string | null;
  responsible: string;
  activity_type: string;
  is_remunerated: boolean;
  work_date: string;
  start_time: string;
  end_time: string;
  description: string;
  notes: string;
  hasExpense: boolean;
  expenses: Record<string, ExpenseCategoryItem>;
  toolDescription: string;
  toolQuantity: number;
  toolAmount: number;
};

const defaultExpenses = (): Record<string, ExpenseCategoryItem> => ({
  alimentacao: { amount: 0, description: "" },
  pedagio: { amount: 0, description: "" },
  deslocamento: { amount: 0, description: "" },
  estacionamento: { amount: 0, description: "" },
  hospedagem: { amount: 0, description: "" },
});

const empty = (): Row => ({
  company_id: null,
  responsible: "",
  activity_type: "consultoria",
  is_remunerated: true,
  work_date: new Date().toISOString().slice(0, 10),
  start_time: "08:00",
  end_time: "12:00",
  description: "",
  notes: "",
  hasExpense: false,
  expenses: defaultExpenses(),
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
  return (ACTIVITY_TYPES as readonly { value: string; label: string }[]).find((t) => t.value === v)?.label ?? v;
}

// Componente com máscara monetária fluida e natural (R$ 0,00)
function CurrencyInput({
  value,
  onChange,
  className,
  placeholder = "R$ 0,00",
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}) {
  const formatted = useMemo(() => {
    if (!value || isNaN(value)) return "";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }, [value]);

  const [display, setDisplay] = useState(formatted);

  useEffect(() => {
    setDisplay(formatted);
  }, [formatted]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (!rawDigits) {
      setDisplay("");
      onChange(0);
      return;
    }
    const num = Number(rawDigits) / 100;
    const nextFormatted = num.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    setDisplay(nextFormatted);
    onChange(num);
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
    />
  );
}

function HorasPage() {
  const qc = useQueryClient();
  const [companyFilter, setCompanyFilter] = useState<string>("__all");
  const [typeFilter, setTypeFilter] = useState<string>("__all");
  const [remunerationFilter, setRemunerationFilter] = useState<string>("__all");
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
  const isManager =
    !!me?.isSuperadmin ||
    (me?.memberships ?? []).some((m: any) => m.member_role === "gestor");
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().slice(0, 10);
  }, []);

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

  const filteredRows = useMemo(() => {
    if (remunerationFilter === "remunerada") {
      return (rows as any[]).filter((r) => r.is_remunerated !== false);
    }
    if (remunerationFilter === "nao_remunerada") {
      return (rows as any[]).filter((r) => r.is_remunerated === false);
    }
    return rows as any[];
  }, [rows, remunerationFilter]);

  const adjustedItems = useMemo(() => {
    return (rows as any[]).filter((r) => !!r.adjusted_by_manager);
  }, [rows]);

  const saveMut = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-hours"] });
      setOpen(false);
      setEditing(null);
      toast.success("Lançamento salvo com sucesso!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar lançamento"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-hours"] });
      toast.success("Lançamento excluído");
    },
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
    if (r.billing_status === "faturado" && !me?.isSuperadmin) {
      toast.error("Lançamento faturado não pode ser editado.");
      return;
    }
    const expsList = r.work_hour_expenses ?? [];
    const expensesObj = defaultExpenses();
    const hasAnyExpense = expsList.length > 0;

    for (const exp of expsList) {
      const cat = exp.category || "deslocamento";
      if (expensesObj[cat]) {
        expensesObj[cat] = {
          amount: Number(exp.amount ?? 0),
          description: exp.description ?? "",
        };
      } else {
        expensesObj["deslocamento"] = {
          amount: Number(exp.amount ?? 0),
          description: exp.description ?? "",
        };
      }
    }

    const tool = r.work_hour_tools?.[0];
    setEditing({
      id: r.id,
      company_id: r.company_id,
      responsible: r.responsible || myName,
      activity_type: r.activity_type,
      is_remunerated: r.is_remunerated !== false,
      work_date: r.work_date,
      start_time: (r.start_time ?? "08:00").slice(0, 5),
      end_time: (r.end_time ?? "12:00").slice(0, 5),
      description: r.description ?? "",
      notes: r.notes ?? "",
      hasExpense: hasAnyExpense,
      expenses: expensesObj,
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
    if (editing.activity_type === "ferramenta" && !editing.toolDescription.trim())
      return toast.error("Descreva a ferramenta utilizada");

    const expensesList = Object.entries(editing.expenses)
      .filter(([_, item]) => item.amount > 0 || (item.description && item.description.trim()))
      .map(([cat, item]) => ({
        category: cat,
        amount: item.amount,
        description: item.description.trim(),
      }));

    saveMut.mutate({
      id: editing.id,
      company_id: editing.company_id,
      responsible: editing.responsible || myName || "—",
      activity_type: editing.activity_type,
      is_remunerated: editing.is_remunerated,
      work_date: editing.work_date,
      start_time: editing.start_time,
      end_time: editing.end_time,
      hours: duration,
      description: editing.description,
      notes: editing.notes,
      expenses: editing.hasExpense ? expensesList : [],
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

  const total = filteredRows.reduce((s: number, r: any) => s + Number(r.hours ?? 0), 0);
  const totalExpenses = filteredRows.reduce(
    (s: number, r: any) =>
      s + (r.work_hour_expenses ?? []).reduce((x: number, e: any) => x + Number(e.amount ?? 0), 0),
    0,
  );
  const totalTools = filteredRows.reduce(
    (s: number, r: any) =>
      s + (r.work_hour_tools ?? []).reduce((x: number, t: any) => x + Number(t.amount ?? 0), 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Lançamento de Horas</h1>
          <p className="text-xs text-muted-foreground">
            Apontamento de horas com controle de remuneração e despesas categorizadas
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openNew} className="h-11 shrink-0">
              <Plus className="mr-1 h-4 w-4" /> Registrar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Editar" : "Registrar"} atendimento</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                {/* 1. Controle no topo: Hora Remunerada vs Hora Não Remunerada */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Status de Remuneração:
                  </Label>
                  <div className="flex rounded-lg border bg-muted/40 p-1">
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, is_remunerated: true })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold transition-all",
                        editing.is_remunerated
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Hora Remunerada
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, is_remunerated: false })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold transition-all",
                        !editing.is_remunerated
                          ? "bg-amber-600 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <AlertCircle className="h-4 w-4" />
                      Hora Não Remunerada
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Empresa *</Label>
                  <Select
                    value={editing.company_id ?? ""}
                    onValueChange={(v) => setEditing({ ...editing, company_id: v || null })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione a empresa" />
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
                      min={isManager ? undefined : minDate}
                      max={isManager ? undefined : new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setEditing({ ...editing, work_date: e.target.value })}
                    />
                    {!isManager && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Lançamento permitido até 48h após o atendimento.
                      </p>
                    )}
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
                    {/* 2. Dropdown atualizado com os tipos exatos de hora */}
                    <Label>Tipo de Hora</Label>
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
                  <Label>Descrição do atendimento *</Label>
                  <Textarea
                    rows={2}
                    placeholder="Ex.: Alinhamento de processos e mentoria com a equipe de compras."
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
                        <CurrencyInput
                          className="h-11"
                          value={editing.toolAmount}
                          onChange={(val) => setEditing({ ...editing, toolAmount: val })}
                        />
                      </div>
                    </div>
                  </Card>
                )}

                {/* 3 & 4. Seção de Despesas: 5 campos categorizados e máscara de moeda fluida */}
                <Card className="space-y-3 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <div>
                        <Label
                          className="text-sm font-semibold cursor-pointer"
                          onClick={() => setEditing({ ...editing, hasExpense: !editing.hasExpense })}
                        >
                          Adicionar despesas neste atendimento?
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Alimentação, pedágio, deslocamento, estacionamento e hospedagem
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={editing.hasExpense}
                      onCheckedChange={(v) => setEditing({ ...editing, hasExpense: v })}
                    />
                  </div>

                  {editing.hasExpense && (
                    <div className="space-y-3 pt-2 border-t">
                      {EXPENSE_CATEGORIES_CONFIG.map((cat) => {
                        const Icon = cat.icon;
                        const currentExp = editing.expenses[cat.key] || {
                          amount: 0,
                          description: "",
                        };
                        return (
                          <div
                            key={cat.key}
                            className="rounded-md border bg-muted/20 p-2.5 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <Icon className="h-3.5 w-3.5 text-primary" />
                                {cat.label}
                              </span>
                              {currentExp.amount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] tabular-nums font-semibold"
                                >
                                  {brl(currentExp.amount)}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Valor
                                </Label>
                                <CurrencyInput
                                  className="h-10 text-sm font-medium"
                                  value={currentExp.amount}
                                  onChange={(val) => {
                                    setEditing({
                                      ...editing,
                                      expenses: {
                                        ...editing.expenses,
                                        [cat.key]: {
                                          ...currentExp,
                                          amount: val,
                                        },
                                      },
                                    });
                                  }}
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <Label className="text-[11px] text-muted-foreground">
                                  Descrição
                                </Label>
                                <Input
                                  className="h-10 text-xs"
                                  placeholder={cat.placeholder}
                                  value={currentExp.description}
                                  onChange={(e) => {
                                    setEditing({
                                      ...editing,
                                      expenses: {
                                        ...editing.expenses,
                                        [cat.key]: {
                                          ...currentExp,
                                          description: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Total de Despesas */}
                      <div className="flex items-center justify-between rounded-lg bg-primary/5 p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold">Total de Despesas:</span>
                        <span className="text-sm font-bold text-primary tabular-nums">
                          {brl(
                            Object.values(editing.expenses).reduce(
                              (acc, curr) => acc + (curr.amount || 0),
                              0,
                            ),
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    placeholder="Notas adicionais sobre o atendimento..."
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
      <Card className="grid gap-2 p-3 sm:grid-cols-4">
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
          <Label className="text-xs">Tipo de Hora</Label>
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
        <div>
          <Label className="text-xs">Remuneração</Label>
          <Select value={remunerationFilter} onValueChange={setRemunerationFilter}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as horas</SelectItem>
              <SelectItem value="remunerada">Hora Remunerada</SelectItem>
              <SelectItem value="nao_remunerada">Hora Não Remunerada</SelectItem>
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

        {period === "personalizado" && (
          <div className="col-span-full grid grid-cols-2 gap-2">
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
          </div>
        )}
      </Card>

      {/* Notificação no Aplicativo: Ajustes Realizados pela Gestão */}
      {adjustedItems.length > 0 && (
        <Card className="p-4 border-amber-400/60 bg-amber-500/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Notificação da Gestão: {adjustedItems.length} lançamento{adjustedItems.length === 1 ? "" : "s"} ajustado{adjustedItems.length === 1 ? "" : "s"}
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 text-[10px] font-bold">
              Auditoria da Gestão
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            A gestão revisou e realizou ajustes em seus lançamentos de horas/despesas. Veja os detalhes abaixo:
          </p>
          <div className="space-y-1.5 pt-1">
            {adjustedItems.slice(0, 5).map((item: any) => (
              <div
                key={item.id}
                className="text-xs bg-background/90 rounded-md p-2.5 border border-amber-300/50 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
              >
                <div>
                  <span className="font-semibold text-foreground">
                    {item.companies?.name || "Cliente"} · {new Date(item.work_date + "T00:00:00").toLocaleDateString("pt-BR")}:
                  </span>{" "}
                  <span className="text-amber-800 dark:text-amber-300 font-medium">
                    {item.manager_note || "Lançamento auditado e ajustado pela gestão."}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0 font-bold self-start sm:self-auto">
                  {fmtDuration(Number(item.hours))}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Total de horas</p>
          <p className="text-2xl font-bold tabular-nums">{fmtDuration(total)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Registros</p>
          <p className="text-2xl font-bold tabular-nums">{filteredRows.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Total Despesas</p>
          <p className="text-lg font-bold tabular-nums">{brl(totalExpenses)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Ferramentas</p>
          <p className="text-lg font-bold tabular-nums">{brl(totalTools)}</p>
        </Card>
      </div>

      {/* Listagem de Horas */}
      {filteredRows.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum registro no período selecionado.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filteredRows.map((r: any) => {
            const faturado = r.billing_status === "faturado";
            const expensesList = r.work_hour_expenses ?? [];
            const tool = (r.work_hour_tools ?? [])[0];
            return (
              <Card key={r.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {r.companies?.name ?? "Sem empresa"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        <span className="tabular-nums">{fmtDuration(Number(r.hours))}</span> ·{" "}
                        {typeLabel(r.activity_type)}
                      </p>
                      {/* Badge Remunerada / Não Remunerada */}
                      {r.is_remunerated === false ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                        >
                          <AlertCircle className="h-3 w-3" /> Não Remunerada
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Remunerada
                        </Badge>
                      )}
                      {r.adjusted_by_manager && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 text-amber-700 dark:text-amber-300 border-amber-400 bg-amber-100/60 dark:bg-amber-950/40 font-medium"
                          title={r.manager_note || "Horas ou remuneração ajustadas pela gestão"}
                        >
                          <AlertCircle className="h-3 w-3" />
                          Ajustado pela Gestão
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.work_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      {r.start_time && r.end_time
                        ? ` · ${String(r.start_time).slice(0, 5)}–${String(r.end_time).slice(0, 5)}`
                        : ""}
                    </p>
                    {r.description && <p className="mt-1 text-sm">{r.description}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {faturado && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" /> Faturado
                        </Badge>
                      )}
                      {expensesList.map((exp: any, idx: number) => {
                        const catConfig = EXPENSE_CATEGORIES_CONFIG.find(
                          (c) => c.key === exp.category,
                        );
                        const CatIcon = catConfig?.icon || Receipt;
                        const label = catConfig?.label || "Despesa";
                        return (
                          <Badge key={idx} variant="outline" className="gap-1 text-xs">
                            <CatIcon className="h-3 w-3 text-primary" />
                            {label}: {brl(Number(exp.amount))}
                          </Badge>
                        );
                      })}
                      {tool && (
                        <Badge variant="outline" className="gap-1">
                          <Wrench className="h-3 w-3" /> {tool.quantity}× {brl(Number(tool.amount))}
                        </Badge>
                      )}
                    </div>

                    {/* Alerta de Notificação de Ajuste da Gestão */}
                    {r.adjusted_by_manager && (
                      <div className="mt-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          Notificação de Ajuste pela Gestão:
                        </div>
                        <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 font-medium">
                          {r.manager_note || "Este lançamento foi auditado e ajustado pela gestão."}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={faturado && !me?.isSuperadmin}
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      disabled={faturado && !me?.isSuperadmin}
                      onClick={() => confirm("Excluir este lançamento?") && delMut.mutate(r.id)}
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
