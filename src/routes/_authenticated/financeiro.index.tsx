import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFinanceOverview,
  createInvoice,
  savePayment,
  deletePayment,
  PAYMENT_METHODS,
  methodLabel,
} from "@/lib/finance.functions";
import { listProjects } from "@/lib/projects.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, FileText, Receipt, Plus, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";

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

function FinanceiroPage() {
  const qc = useQueryClient();
  const { companyId } = useActiveCompany();
  const [projectFilter, setProjectFilter] = useState("__all");
  const [selected, setSelected] = useState<string[]>([]);
  const [rate, setRate] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState({
    paid_at: new Date().toISOString().slice(0, 10),
    amount: 0,
    method: "pix",
    reference: "",
    notes: "",
    project_id: "__none",
  });

  const overviewFn = useServerFn(getFinanceOverview);
  const projectsFn = useServerFn(listProjects);
  const invoiceFn = useServerFn(createInvoice);
  const payFn = useServerFn(savePayment);
  const delPayFn = useServerFn(deletePayment);

  const { data: projects } = useQuery({
    queryKey: ["projects", companyId],
    queryFn: () => projectsFn({ data: companyId ? { company_id: companyId } : {} } as any),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["finance", companyId, projectFilter],
    enabled: !!companyId,
    queryFn: () =>
      overviewFn({
        data: {
          ...(companyId ? { company_id: companyId } : {}),
          ...(projectFilter !== "__all" ? { project_id: projectFilter } : {}),
        },
      } as any),
  });

  const openHours = useMemo(
    () => (data?.hours ?? []).filter((h: any) => h.billing_status !== "faturado"),
    [data],
  );

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
          project_id: projectFilter !== "__all" ? projectFilter : null,
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
          project_id: payment.project_id !== "__none" ? payment.project_id : null,
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
        project_id: "__none",
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

  const totals = data?.totals;
  const balance = totals?.balance ?? 0;
  const situation = balance > 0.009 ? "DEVEDOR" : balance < -0.009 ? "CRÉDITO" : "QUITADO";

  if (!companyId) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Selecione uma empresa no topo para ver o financeiro.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Wallet className="h-5 w-5 text-primary" /> Financeiro
          </h1>
          <p className="text-sm text-muted-foreground">Conta corrente, faturamento e pagamentos.</p>
        </div>
        <div className="flex gap-2">
          <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setSelected([]); }}>
            <SelectTrigger className="h-10 w-full sm:w-56">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os projetos</SelectItem>
              {(projects ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setPayOpen(true)} className="shrink-0">
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
            <Card className="p-6 text-sm text-muted-foreground">Nenhuma hora em aberto.</Card>
          ) : (
            <>
              <Card className="divide-y">
                {openHours.map((h: any) => {
                  const exp = (h.work_hour_expenses ?? []).reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0);
                  const tools = (h.work_hour_tools ?? []).reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0);
                  return (
                    <label key={h.id} className="flex cursor-pointer items-start gap-3 p-3 text-sm">
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
                          {h.projects?.name && (
                            <span className="text-xs text-muted-foreground">{h.projects.name}</span>
                          )}
                        </div>
                        <p className="mt-0.5 break-words text-muted-foreground">
                          {h.description || h.notes || "—"}
                        </p>
                        {(exp > 0 || tools > 0) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {exp > 0 && `Despesas ${brl(exp)}`}
                            {exp > 0 && tools > 0 && " · "}
                            {tools > 0 && `Ferramentas ${brl(tools)}`}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </Card>

              <Card className="space-y-3 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Valor da hora (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="h-11"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="h-11 w-full"
                      disabled={!selected.length || rate <= 0}
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
                  <span className="font-semibold">{brl(inv.total_amount)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {inv.projects?.name ? `${inv.projects.name} · ` : ""}
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
                    {[p.projects?.name, p.reference, p.notes].filter(Boolean).join(" · ") || "—"}
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
              <div>
                <Label>Projeto</Label>
                <Select
                  value={payment.project_id}
                  onValueChange={(v) => setPayment({ ...payment, project_id: v })}
                >
                  <SelectTrigger className="h-11"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sem projeto</SelectItem>
                    {(projects ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
