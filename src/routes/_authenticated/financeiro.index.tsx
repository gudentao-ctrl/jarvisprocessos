import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFinanceOverview,
  createInvoice,
  savePayment,
  deletePayment,
  deleteInvoice,
  PAYMENT_METHODS,
  methodLabel,
} from "@/lib/finance.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { getMe } from "@/lib/access.functions";
import { useActiveCompany } from "@/lib/active-company";
import { saveWorkHours, ACTIVITY_TYPES } from "@/lib/work-hours.functions";
import { auditWorkHourFromFinance } from "@/lib/maia-finance.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Wallet,
  FileText,
  Receipt,
  Plus,
  Trash2,
  Lock,
  FileDown,
  Pencil,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
  Milestone,
  Car,
  CircleParking,
  Hotel,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getBilledReport } from "@/lib/finance.functions";
import { exportBilledPdf, type BilledPdfMode } from "@/lib/invoice-pdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/financeiro/")({
  component: FinanceiroPage,
  head: () => ({
    meta: [
      { title: "Financeiro do projeto | JARVIS" },
      {
        name: "description",
        content:
          "Conta corrente por cliente: horas em aberto, faturamento, pagamentos recebidos e saldo do projeto.",
      },
      { property: "og:title", content: "Financeiro do projeto | JARVIS" },
      {
        property: "og:description",
        content: "Horas em aberto, faturamento, pagamentos e saldo por cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const brl = (n: number) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "—");
const fmtHours = (h: number) => {
  const t = Math.round(Number(h ?? 0) * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export const EXPENSE_CATEGORIES_CONFIG = [
  { key: "alimentacao", label: "Alimentação", icon: UtensilsCrossed, placeholder: "Ex.: Almoço durante visita ao cliente" },
  { key: "pedagio", label: "Pedágio", icon: Milestone, placeholder: "Ex.: Praça de pedágio BR-369" },
  { key: "deslocamento", label: "Deslocamento", icon: Car, placeholder: "Ex.: Combustível / Uber / Km rodado" },
  { key: "estacionamento", label: "Estacionamento", icon: CircleParking, placeholder: "Ex.: Estacionamento centro / aeroporto" },
  { key: "hospedagem", label: "Hospedagem", icon: Hotel, placeholder: "Ex.: Hotel / estadia" },
] as const;

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

function FinanceiroPage() {
  const qc = useQueryClient();
  const { companyId: globalCompanyId } = useActiveCompany();
  const [companyId, setCompanyId] = useState<string | null>(globalCompanyId ?? null);
  const [selected, setSelected] = useState<string[]>([]);
  const [consultantFilter, setConsultantFilter] = useState<string>("__all");
  const [rateStr, setRateStr] = useState("");
  const rate = rateStr === "" ? 0 : Number(rateStr.replace(",", ".")) || 0;
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editingHour, setEditingHour] = useState<any>(null);
  const [payment, setPayment] = useState({
    paid_at: new Date().toISOString().slice(0, 10),
    amount: 0,
    method: "pix",
    reference: "",
    notes: "",
  });

  const overviewFn = useServerFn(getFinanceOverview);
  const companiesFn = useServerFn(listCompanies);
  const invoiceFn = useServerFn(createInvoice);
  const payFn = useServerFn(savePayment);
  const delPayFn = useServerFn(deletePayment);
  const delInvoiceFn = useServerFn(deleteInvoice);
  const meFn = useServerFn(getMe);
  const billedFn = useServerFn(getBilledReport);
  const auditHourFn = useServerFn(auditWorkHourFromFinance);

  async function exportPdf(mode: BilledPdfMode) {
    if (!companyId) return;
    try {
      const report: any = await billedFn({ data: { company_id: companyId } } as any);
      if (!report?.rows?.length) {
        toast.error("Nenhum lançamento faturado para esta empresa.");
        return;
      }
      exportBilledPdf(report, mode);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível gerar o PDF.");
    }
  }

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesFn(),
  });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const activeCompanies = useMemo(
    () => (companies as any[]).filter((c) => c.is_active !== false),
    [companies],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["finance", companyId],
    queryFn: () =>
      overviewFn({ data: companyId ? { company_id: companyId } : {} } as any),
  });

  const consultants = useMemo(() => {
    const s = new Set<string>();
    for (const h of data?.hours ?? []) {
      if (h.responsible) s.add(h.responsible);
    }
    return Array.from(s).sort();
  }, [data?.hours]);

  const openHours = useMemo(() => {
    let list = (data?.hours ?? []).filter((h: any) => h.billing_status !== "faturado");
    if (consultantFilter !== "__all") {
      list = list.filter((h: any) => h.responsible === consultantFilter);
    }
    return list;
  }, [data, consultantFilter]);

  const selectedRows = useMemo(
    () => openHours.filter((h: any) => selected.includes(h.id)),
    [openHours, selected],
  );

  const preview = useMemo(() => {
    const hours = selectedRows.reduce((s: number, r: any) => s + Number(r.hours ?? 0), 0);
    const expenses = selectedRows.reduce(
      (s: number, r: any) =>
        s + (r.work_hour_expenses ?? []).reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0),
      0,
    );
    const tools = selectedRows.reduce(
      (s: number, r: any) =>
        s + (r.work_hour_tools ?? []).reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0),
      0,
    );
    const hoursAmount = Math.round(hours * rate * 100) / 100;
    return { hours, expenses, tools, hoursAmount, total: hoursAmount + expenses + tools };
  }, [selectedRows, rate]);

  const invoiceMut = useMutation({
    mutationFn: () =>
      invoiceFn({
        data: {
          company_id: companyId!,
          project_id: null,
          work_hour_ids: selected,
          hourly_rate: rate,
          notes: invoiceNotes,
        },
      } as any),
    onSuccess: () => {
      toast.success("Horas faturadas com sucesso");
      setSelected([]);
      setInvoiceNotes("");
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["work-hours"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível faturar"),
  });

  const payMut = useMutation({
    mutationFn: () =>
      payFn({
        data: {
          company_id: companyId!,
          project_id: null,
          paid_at: payment.paid_at,
          amount: Number(payment.amount),
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
        },
      } as any),
    onSuccess: () => {
      toast.success("Pagamento registrado");
      setPayOpen(false);
      setPayment({
        paid_at: new Date().toISOString().slice(0, 10),
        amount: 0,
        method: "pix",
        reference: "",
        notes: "",
      });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar"),
  });

  const delPayMut = useMutation({
    mutationFn: (id: string) => delPayFn({ data: { id } } as any),
    onSuccess: () => {
      toast.success("Pagamento removido");
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível remover"),
  });

  const delInvoiceMut = useMutation({
    mutationFn: (id: string) => delInvoiceFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Fatura desfeita e horas reabertas");
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["work-hours"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível desfazer a fatura"),
  });

  const editHourMut = useMutation({
    mutationFn: (payload: any) => auditHourFn({ data: payload }),
    onSuccess: (res: any) => {
      toast.success("Lançamento auditado com sucesso! Notificação registrada.");
      setEditingHour(null);
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["work-hours"] });
      qc.invalidateQueries({ queryKey: ["audit-work-hours"] });
      qc.invalidateQueries({ queryKey: ["maia-dre"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar o ajuste de auditoria"),
  });

  const totals = data?.totals;
  const balance = totals?.balance ?? 0;
  const situation = balance > 0.009 ? "DEVEDOR" : balance < -0.009 ? "CRÉDITO" : "QUITADO";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Wallet className="h-5 w-5 text-primary" /> Financeiro Cliente
          </h1>
          <p className="text-sm text-muted-foreground">Conta corrente, faturamento e pagamentos por cliente.</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={companyId ?? "__all"}
            onValueChange={(v) => { setCompanyId(v === "__all" ? null : v); setSelected([]); }}
          >
            <SelectTrigger className="h-10 w-full sm:w-56">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as empresas ativas</SelectItem>
              {activeCompanies.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!companyId} className="shrink-0">
                <FileDown className="mr-1 h-4 w-4" /> Relatório PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportPdf("consultor")}>
                Detalhado por consultor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPdf("resumido")}>
                Compilado resumido
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setPayOpen(true)} disabled={!companyId} className="shrink-0">
            <Plus className="mr-1 h-4 w-4" /> Pagamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Horas em aberto" value={fmtHours(totals?.hoursOpen ?? 0)} />
        <Stat label="Faturado" value={brl(totals?.invoiced ?? 0)} />
        <Stat label="Recebido" value={brl(totals?.paid ?? 0)} />
        <Stat
          label="Saldo"
          value={brl(Math.abs(balance))}
          hint={situation}
          tone={situation === "DEVEDOR" ? "warn" : situation === "CRÉDITO" ? "info" : "ok"}
        />
      </div>

      <Tabs defaultValue="aberto">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="aberto">Horas em aberto</TabsTrigger>
          <TabsTrigger value="faturas">Faturas</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="aberto" className="space-y-3 pt-3">
          {isLoading ? (
            <Card className="p-6 text-sm text-muted-foreground">Carregando…</Card>
          ) : openHours.length === 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground font-semibold">Consultor:</Label>
                <Select value={consultantFilter} onValueChange={(v) => { setConsultantFilter(v); setSelected([]); }}>
                  <SelectTrigger className="h-9 w-48 text-xs">
                    <SelectValue placeholder="Todos os consultores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todos os consultores</SelectItem>
                    {consultants.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Card className="p-6 text-sm text-muted-foreground">Nenhuma hora em aberto para faturamento.</Card>
            </div>
          ) : (
            <>
              {/* Filtro de Consultores e Ações em Lote */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground font-semibold">Consultor:</Label>
                  <Select value={consultantFilter} onValueChange={(v) => { setConsultantFilter(v); setSelected([]); }}>
                    <SelectTrigger className="h-9 w-48 text-xs">
                      <SelectValue placeholder="Todos os consultores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Todos os consultores</SelectItem>
                      {consultants.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setSelected(openHours.map((h: any) => h.id))}
                  >
                    Selecionar todos ({openHours.length})
                  </Button>
                  {selected.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={() => setSelected([])}
                    >
                      Limpar ({selected.length})
                    </Button>
                  )}
                </div>
              </div>

              <Card className="divide-y">
                {openHours.map((h: any) => {
                  const expensesList = h.work_hour_expenses ?? [];
                  const tools = (h.work_hour_tools ?? []).reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0);
                  return (
                    <div key={h.id} className="flex items-start gap-3 p-3 text-sm hover:bg-muted/30 transition-colors">
                      <Checkbox
                        checked={selected.includes(h.id)}
                        onCheckedChange={(c) =>
                          setSelected((s) => (c ? [...s, h.id] : s.filter((x) => x !== h.id)))
                        }
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{fmtDate(h.work_date)}</span>
                          <Badge variant="secondary">{fmtHours(h.hours)}</Badge>
                          {h.responsible && (
                            <Badge variant="outline" className="text-[11px] font-normal">{h.responsible}</Badge>
                          )}
                          {h.companies?.name && (
                            <span className="text-xs text-muted-foreground">{h.companies.name}</span>
                          )}
                          {h.is_remunerated === false && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                              Não Remunerada
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 break-words text-muted-foreground">
                          {h.description || h.notes || "—"}
                        </p>
                        {/* Detalhamento de todas as despesas lançadas */}
                        {expensesList.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {expensesList.map((e: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-[10px] py-0">
                                {e.category ? `${e.category}: ` : "Desp: "}{brl(e.amount)}
                                {e.description && ` (${e.description})`}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {tools > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Ferramentas {brl(tools)}
                          </p>
                        )}

                        {/* Alerta de Notificação de Ajuste da Gestão */}
                        {h.adjusted_by_manager && (
                          <div className="mt-2 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-2 text-xs text-amber-900 dark:text-amber-200">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-[11px]">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              Ajustado pela Gestão:
                            </div>
                            <p className="mt-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                              {h.manager_note || "Lançamento auditado e ajustado pela gestão."}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs shrink-0 font-medium"
                        onClick={(ev) => {
                          ev.preventDefault();
                          const expsList = h.work_hour_expenses ?? [];
                          const expensesObj: Record<string, { amount: number; description: string }> = {
                            alimentacao: { amount: 0, description: "" },
                            pedagio: { amount: 0, description: "" },
                            deslocamento: { amount: 0, description: "" },
                            estacionamento: { amount: 0, description: "" },
                            hospedagem: { amount: 0, description: "" },
                          };
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
                          setEditingHour({
                            id: h.id,
                            company_id: h.company_id,
                            responsible: h.responsible ?? "",
                            activity_type: h.activity_type ?? "consultoria",
                            work_date: h.work_date ?? "",
                            hours: Number(h.hours),
                            description: h.description ?? "",
                            notes: h.notes ?? "",
                            is_remunerated: h.is_remunerated !== false,
                            hasExpense: expsList.length > 0,
                            expenses: expensesObj,
                            manager_note: "",
                          });
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Auditar
                      </Button>
                    </div>
                  );
                })}
              </Card>

              <Card className="space-y-3 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Valor da hora (R$)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 150 ou 150,00"
                      value={rateStr}
                      onChange={(e) => setRateStr(e.target.value.replace(/[^0-9.,]/g, ""))}
                      className="h-11"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="h-11 w-full"
                      disabled={!selected.length || rate <= 0 || !companyId}
                      onClick={() => setConfirmOpen(true)}
                    >
                      Faturar {selected.length} lançamento{selected.length === 1 ? "" : "s"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecionado: {fmtHours(preview.hours)} · Horas {brl(preview.hoursAmount)} · Despesas{" "}
                  {brl(preview.expenses)} · Ferramentas {brl(preview.tools)} ·{" "}
                  <strong className="text-foreground">Total {brl(preview.total)}</strong>
                </p>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="faturas" className="space-y-2 pt-3">
          {(data?.invoices ?? []).length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">Nenhuma fatura emitida.</Card>
          ) : (
            (data?.invoices ?? []).map((inv: any) => (
              <Card key={inv.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4 text-primary" />
                    {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{brl(inv.total_amount)}</span>
                    {me?.isSuperadmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Desfazer fatura"
                        disabled={delInvoiceMut.isPending}
                        onClick={() => confirm("Desfazer esta fatura e reabrir as horas vinculadas?") && delInvoiceMut.mutate(inv.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {inv.companies?.name ? `${inv.companies.name} · ` : ""}
                  {fmtHours(inv.hours_total)} a {brl(inv.hourly_rate)}/h · despesas {brl(inv.expenses_amount)} ·
                  ferramentas {brl(inv.tools_amount)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Faturado em {new Date(inv.invoiced_at).toLocaleDateString("pt-BR")}
                </p>
                {inv.notes && <p className="mt-1 text-xs text-muted-foreground">{inv.notes}</p>}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pagamentos" className="space-y-2 pt-3">
          {(data?.payments ?? []).length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">Nenhum pagamento registrado.</Card>
          ) : (
            (data?.payments ?? []).map((p: any) => (
              <Card key={p.id} className="flex items-start gap-3 p-4 text-sm">
                <Receipt className="mt-0.5 h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{fmtDate(p.paid_at)}</span>
                    <Badge variant="secondary">{methodLabel(p.method)}</Badge>
                    <span className="font-semibold">{brl(p.amount)}</span>
                  </div>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {[p.companies?.name, p.reference, p.notes].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => delPayMut.mutate(p.id)}
                  aria-label="Excluir pagamento"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmação de faturamento */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar faturamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <Line label="Lançamentos" value={String(selected.length)} />
            <Line label="Horas" value={fmtHours(preview.hours)} />
            <Line label="Valor da hora" value={brl(rate)} />
            <Line label="Horas" value={brl(preview.hoursAmount)} />
            <Line label="Despesas" value={brl(preview.expenses)} />
            <Line label="Ferramentas" value={brl(preview.tools)} />
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{brl(preview.total)}</span>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Após faturar, esses lançamentos não podem mais ser alterados ou excluídos.
            </p>
          </div>
          <Button
            className="h-11 w-full"
            disabled={invoiceMut.isPending}
            onClick={() => invoiceMut.mutate()}
          >
            {invoiceMut.isPending ? "Faturando…" : "Confirmar e faturar"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Pagamento */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  className="h-11"
                  value={payment.paid_at}
                  onChange={(e) => setPayment({ ...payment, paid_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-11"
                  value={payment.amount}
                  onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Forma</Label>
                <Select
                  value={payment.method}
                  onValueChange={(v) => setPayment({ ...payment, method: v })}
                >
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Referência</Label>
              <Input
                className="h-11"
                value={payment.reference}
                onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
              />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                rows={2}
                value={payment.notes}
                onChange={(e) => setPayment({ ...payment, notes: e.target.value })}
              />
            </div>
            <Button
              className="h-11 w-full"
              disabled={payMut.isPending || payment.amount <= 0}
              onClick={() => payMut.mutate()}
            >
              {payMut.isPending ? "Salvando…" : "Salvar pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Auditoria do Lançamento (Financeiro Cliente) */}
      {editingHour && (
        <Dialog open={!!editingHour} onOpenChange={() => setEditingHour(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" /> Auditar Lançamento de Horas
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-1 text-sm">
              {/* 1. Status de Remuneração: Hora Remunerada vs Não Remunerada (EDITÁVEL) */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold">
                  Status de Remuneração (Editável):
                </Label>
                <div className="flex rounded-lg border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => setEditingHour({ ...editingHour, is_remunerated: true })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold transition-all",
                      editingHour.is_remunerated
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Hora Remunerada
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingHour({ ...editingHour, is_remunerated: false })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold transition-all",
                      !editingHour.is_remunerated
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <AlertCircle className="h-4 w-4" />
                    Hora Não Remunerada
                  </button>
                </div>
              </div>

              {/* 2. Cliente / Empresa (EDITÁVEL) */}
              <div>
                <Label className="font-semibold">Cliente / Empresa (Editável) *</Label>
                <Select
                  value={editingHour.company_id ?? ""}
                  onValueChange={(v) => setEditingHour({ ...editingHour, company_id: v })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o cliente" />
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

              {/* 3. Quantidade de Horas (EDITÁVEL) e Data (Somente Leitura) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-semibold">Quantidade de Horas (Editável) *</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    className="h-10 font-bold tabular-nums"
                    value={editingHour.hours}
                    onChange={(e) =>
                      setEditingHour({ ...editingHour, hours: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Data (Somente Leitura)</Label>
                  <Input
                    className="h-10 bg-muted/40"
                    disabled
                    readOnly
                    value={fmtDate(editingHour.work_date)}
                  />
                </div>
              </div>

              {/* 4. Consultor e Tipo de Hora (Somente Leitura) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">Consultor (Somente Leitura)</Label>
                  <Input className="h-10 bg-muted/40" disabled readOnly value={editingHour.responsible} />
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Hora (Somente Leitura)</Label>
                  <Input
                    className="h-10 bg-muted/40 capitalize"
                    disabled
                    readOnly
                    value={editingHour.activity_type}
                  />
                </div>
              </div>

              {/* 5. Descrição do Atendimento (Somente Leitura) */}
              <div>
                <Label className="text-muted-foreground">Descrição do Atendimento (Somente Leitura)</Label>
                <Textarea
                  rows={2}
                  disabled
                  readOnly
                  className="bg-muted/40 resize-none text-xs"
                  value={editingHour.description}
                />
              </div>

              {/* 6. Lançamentos de Despesa (EDITÁVEL) */}
              <Card className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <div>
                      <Label
                        className="text-xs font-semibold cursor-pointer"
                        onClick={() =>
                          setEditingHour({
                            ...editingHour,
                            hasExpense: !editingHour.hasExpense,
                          })
                        }
                      >
                        Lançamentos de Despesa (Editável)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Alimentação, pedágio, deslocamento, estacionamento e hospedagem
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={editingHour.hasExpense}
                    onCheckedChange={(v) =>
                      setEditingHour({ ...editingHour, hasExpense: v })
                    }
                  />
                </div>

                {editingHour.hasExpense && (
                  <div className="space-y-2.5 pt-2 border-t">
                    {EXPENSE_CATEGORIES_CONFIG.map((cat) => {
                      const Icon = cat.icon;
                      const currentExp = editingHour.expenses?.[cat.key] || {
                        amount: 0,
                        description: "",
                      };
                      return (
                        <div
                          key={cat.key}
                          className="rounded-md border bg-muted/20 p-2 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <Icon className="h-3.5 w-3.5 text-primary" />
                              {cat.label}
                            </span>
                            {currentExp.amount > 0 && (
                              <Badge variant="secondary" className="text-[10px] font-bold">
                                {brl(currentExp.amount)}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                              <CurrencyInput
                                className="h-9 text-xs"
                                value={currentExp.amount}
                                onChange={(val) => {
                                  const updated = {
                                    ...editingHour.expenses,
                                    [cat.key]: { ...currentExp, amount: val },
                                  };
                                  setEditingHour({ ...editingHour, expenses: updated });
                                }}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                className="h-9 text-xs"
                                placeholder={cat.placeholder}
                                value={currentExp.description}
                                onChange={(e) => {
                                  const updated = {
                                    ...editingHour.expenses,
                                    [cat.key]: {
                                      ...currentExp,
                                      description: e.target.value,
                                    },
                                  };
                                  setEditingHour({ ...editingHour, expenses: updated });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Justificativa Adicional Opcional */}
              <div>
                <Label className="text-xs">Observação / Justificativa da Gestão (Opcional)</Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="Ex.: Alinhado previamente com o cliente"
                  value={editingHour.manager_note}
                  onChange={(e) =>
                    setEditingHour({ ...editingHour, manager_note: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingHour(null)}>
                Cancelar
              </Button>
              <Button
                disabled={editHourMut.isPending || !editingHour.company_id || editingHour.hours <= 0}
                onClick={() => {
                  const expensesList = editingHour.hasExpense
                    ? Object.entries(editingHour.expenses || {})
                        .filter(([_, item]: any) => item.amount > 0 || (item.description && item.description.trim()))
                        .map(([cat, item]: any) => ({
                          category: cat,
                          amount: Number(item.amount || 0),
                          description: item.description?.trim() || "",
                        }))
                    : [];

                  editHourMut.mutate({
                    id: editingHour.id,
                    hours: editingHour.hours,
                    is_remunerated: editingHour.is_remunerated,
                    company_id: editingHour.company_id,
                    expenses: expensesList,
                    manager_note: editingHour.manager_note,
                  });
                }}
              >
                {editHourMut.isPending ? "Salvando Ajuste…" : "Salvar Ajuste da Auditoria"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "info";
}) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold tracking-tight">{value}</p>
      {hint && (
        <Badge
          variant={tone === "warn" ? "destructive" : "secondary"}
          className="mt-1 text-[10px]"
        >
          {hint}
        </Badge>
      )}
    </Card>
  );
}
