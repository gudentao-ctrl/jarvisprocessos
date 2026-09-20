import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listMaiaTaxes,
  saveMaiaTax,
  deleteMaiaTax,
  listConsultantContracts,
  saveConsultantContract,
  listAuditWorkHours,
  updateAuditedWorkHour,
  approveAuditBatch,
  getTeamClosingData,
  closeConsultantMonth,
  toggleNfReceived,
  getMaiaDreData,
  saveMaiaDreEntry,
  deleteMaiaDreEntry,
  cloneDreEntriesFromPreviousMonth,
} from "@/lib/maia-finance.functions";
import { listCompanies } from "@/lib/interviews.functions";
import { getMe } from "@/lib/access.functions";
import { exportMaiaDrePdf } from "@/lib/maia-dre-pdf";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Landmark,
  ShieldCheck,
  Percent,
  FileCheck2,
  Users,
  LineChart,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Clock,
  Receipt,
  FileDown,
  Copy,
  Bell,
  Lock,
  Database,
  Mail,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/financeiro-maia/")({
  component: FinanceiroMaiaPage,
  head: () => ({
    meta: [
      { title: "Financeiro Maia | Gestão Corporativa" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const brl = (n: number) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtHours = (h: number) => {
  const t = Math.round(Number(h ?? 0) * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

const fmtDate = (d?: string | null) => (d ? String(d).split("-").reverse().join("/") : "—");

function currentMonthYear() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export const FINANCEIRO_MAIA_SQL_SCRIPT = `-- ============================================================
-- SCRIPT DE INSTALAÇÃO / ATUALIZAÇÃO DO FINANCEIRO MAIA
-- Cole e execute no SQL Editor do Supabase para criar as tabelas
-- ============================================================

-- 1. Impostos
CREATE TABLE IF NOT EXISTS public.maia_tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate_percent numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maia_tax_settings TO authenticated;
GRANT ALL ON public.maia_tax_settings TO service_role;
ALTER TABLE public.maia_tax_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin or manager can manage maia_tax_settings" ON public.maia_tax_settings;
CREATE POLICY "superadmin or manager can manage maia_tax_settings" ON public.maia_tax_settings
  FOR ALL TO authenticated
  USING (private.is_superadmin() OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'))
  WITH CHECK (private.is_superadmin() OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'));
INSERT INTO public.maia_tax_settings (name, rate_percent) VALUES ('Simples Nacional / ISS', 6.00) ON CONFLICT DO NOTHING;

-- 2. Contratos (Sigiloso - SuperAdmin)
CREATE TABLE IF NOT EXISTS public.consultant_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_regime text NOT NULL DEFAULT 'hora',
  monthly_fixed_amount numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  base_floor_amount numeric NOT NULL DEFAULT 0,
  min_hours numeric NOT NULL DEFAULT 0,
  extra_hour_rate numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultant_contracts_user_id_key UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_contracts TO authenticated;
GRANT ALL ON public.consultant_contracts TO service_role;
ALTER TABLE public.consultant_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin only consultant_contracts" ON public.consultant_contracts;
DROP POLICY IF EXISTS "superadmin or manager only consultant_contracts" ON public.consultant_contracts;
CREATE POLICY "superadmin only consultant_contracts" ON public.consultant_contracts
  FOR ALL TO authenticated
  USING (private.is_superadmin())
  WITH CHECK (private.is_superadmin());

-- 3. Fechamentos de Equipe
CREATE TABLE IF NOT EXISTS public.consultant_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  payment_regime_snapshot text NOT NULL,
  contract_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_hours numeric NOT NULL DEFAULT 0,
  min_hours_snapshot numeric NOT NULL DEFAULT 0,
  deficit_hours numeric NOT NULL DEFAULT 0,
  base_amount numeric NOT NULL DEFAULT 0,
  extra_amount numeric NOT NULL DEFAULT 0,
  expense_reimbursement numeric NOT NULL DEFAULT 0,
  total_payable numeric NOT NULL DEFAULT 0,
  nf_received boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'aberto',
  closed_by uuid REFERENCES auth.users(id),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultant_closings_user_month_key UNIQUE (user_id, month_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_closings TO authenticated;
GRANT ALL ON public.consultant_closings TO service_role;
ALTER TABLE public.consultant_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "managers can manage closings and consultants see own" ON public.consultant_closings;
CREATE POLICY "managers can manage closings and consultants see own" ON public.consultant_closings
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.is_superadmin() OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'))
  WITH CHECK (private.is_superadmin() OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'));

-- 4. Conta Corrente
CREATE TABLE IF NOT EXISTS public.consultant_current_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance_hours numeric NOT NULL DEFAULT 0,
  debt_installments_requested boolean NOT NULL DEFAULT false,
  debt_installments_count int NOT NULL DEFAULT 1,
  debt_installments_status text NOT NULL DEFAULT 'none',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_current_accounts TO authenticated;
GRANT ALL ON public.consultant_current_accounts TO service_role;
ALTER TABLE public.consultant_current_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "current accounts access" ON public.consultant_current_accounts;
CREATE POLICY "current accounts access" ON public.consultant_current_accounts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.is_superadmin() OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'))
  WITH CHECK (user_id = auth.uid() OR private.is_superadmin() OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'));

-- 5. Custos do DRE
CREATE TABLE IF NOT EXISTS public.maia_dre_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  entry_type text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maia_dre_entries TO authenticated;
GRANT ALL ON public.maia_dre_entries TO service_role;
ALTER TABLE public.maia_dre_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin or manager can manage dre entries" ON public.maia_dre_entries;
CREATE POLICY "superadmin or manager can manage dre entries" ON public.maia_dre_entries
  FOR ALL TO authenticated
  USING (private.is_superadmin() OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'))
  WITH CHECK (private.is_superadmin() OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'));

-- 6. Colunas de Auditoria
ALTER TABLE public.work_hours
  ADD COLUMN IF NOT EXISTS audit_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS adjusted_by_manager boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manager_note text DEFAULT '';

-- 7. Recarregar cache PostgREST
NOTIFY pgrst, 'reload schema';
`;

function FinanceiroMaiaPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("auditoria");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear());

  // Queries de autorização
  const getMeFn = useServerFn(getMe);
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: () => getMeFn() });
  const isManagerOrAdmin =
    !!profile?.isSuperadmin ||
    (profile?.memberships ?? []).some(
      (m: any) => m.role === "gestor" || m.permissions?.gestao === true,
    );

  if (!isManagerOrAdmin && profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <ShieldCheck className="h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">Acesso Restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          O módulo corporativo Financeiro Maia é de acesso estritamente reservado à Gerência e
          Superadministração.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground">
            <Landmark className="h-6 w-6 text-primary" /> Financeiro Maia
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Auditoria de lançamentos, fechamento de equipe com conta corrente, DRE e impostos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            title="Copiar script SQL para executar no Supabase"
            onClick={() => {
              navigator.clipboard.writeText(FINANCEIRO_MAIA_SQL_SCRIPT);
              toast.success("Script SQL copiado!", {
                description:
                  "Abra o SQL Editor do Supabase, cole e execute para criar/atualizar as tabelas.",
              });
            }}
          >
            <Database className="h-4 w-4" /> Copiar SQL Supabase
          </Button>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">Mês:</Label>
            <Input
              type="month"
              className="h-10 w-36 text-sm font-medium"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-12">
          <TabsTrigger value="auditoria" className="gap-2 text-xs sm:text-sm font-semibold">
            <FileCheck2 className="h-4 w-4" /> Auditoria de Horas
          </TabsTrigger>
          <TabsTrigger value="fechamento" className="gap-2 text-xs sm:text-sm font-semibold">
            <Users className="h-4 w-4" /> Fechamento de Equipe & NFs
          </TabsTrigger>
          <TabsTrigger value="dre" className="gap-2 text-xs sm:text-sm font-semibold">
            <LineChart className="h-4 w-4" /> DRE Corporativo
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="gap-2 text-xs sm:text-sm font-semibold">
            <Percent className="h-4 w-4" /> Impostos & Contratos
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA 1: AUDITORIA DE HORAS ────────────────────────────────────────── */}
        <TabsContent value="auditoria">
          <AuditoriaSection selectedMonth={selectedMonth} />
        </TabsContent>

        {/* ─── ABA 2: FECHAMENTO DE EQUIPE & NFs ──────────────────────────────── */}
        <TabsContent value="fechamento">
          <FechamentoSection selectedMonth={selectedMonth} />
        </TabsContent>

        {/* ─── ABA 3: DRE CORPORATIVO ─────────────────────────────────────────── */}
        <TabsContent value="dre">
          <DreSection selectedMonth={selectedMonth} />
        </TabsContent>

        {/* ─── ABA 4: CONFIGURAÇÕES DE IMPOSTOS E CONTRATOS ───────────────────── */}
        <TabsContent value="configuracoes">
          <ConfiguracoesSection isSuperadmin={!!profile?.isSuperadmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: AUDITORIA DE HORAS
// ══════════════════════════════════════════════════════════════════════════════

function AuditoriaSection({ selectedMonth }: { selectedMonth: string }) {
  const qc = useQueryClient();
  const [consultantFilter, setConsultantFilter] = useState<string>("__all");
  const [companyFilter, setCompanyFilter] = useState<string>("__all");
  const [statusFilter, setStatusFilter] = useState<string>("__all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);

  const listAuditFn = useServerFn(listAuditWorkHours);
  const updateAuditFn = useServerFn(updateAuditedWorkHour);
  const approveBatchFn = useServerFn(approveAuditBatch);
  const listCompaniesFn = useServerFn(listCompanies);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompaniesFn(),
  });

  const { data: hours = [], isLoading } = useQuery({
    queryKey: ["audit-work-hours", selectedMonth, consultantFilter, companyFilter, statusFilter],
    queryFn: () =>
      listAuditFn({
        data: {
          month_year: selectedMonth,
          consultant_id: consultantFilter !== "__all" ? consultantFilter : undefined,
          company_id: companyFilter !== "__all" ? companyFilter : undefined,
          audit_status: statusFilter !== "__all" ? statusFilter : undefined,
        },
      }),
  });

  const consultants = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of hours) {
      if (h.user_id && h.responsible) map.set(h.user_id, h.responsible);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [hours]);

  const approveBatchMut = useMutation({
    mutationFn: (ids: string[]) => approveBatchFn({ data: { work_hour_ids: ids } }),
    onSuccess: (res) => {
      toast.success(`${res.count} lançamentos aprovados com sucesso!`);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["audit-work-hours"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao aprovar lançamentos"),
  });

  const updateItemMut = useMutation({
    mutationFn: (payload: any) => updateAuditFn({ data: payload }),
    onSuccess: () => {
      toast.success("Ajuste da gestão salvo. Notificação registrada para o consultor.");
      setEditingItem(null);
      qc.invalidateQueries({ queryKey: ["audit-work-hours"] });
      qc.invalidateQueries({ queryKey: ["work-hours"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar ajuste"),
  });

  return (
    <div className="space-y-4">
      {/* Filtros e Ações de Auditoria */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Consultor</Label>
              <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                <SelectTrigger className="h-9 w-44 text-xs">
                  <SelectValue placeholder="Todos os consultores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todos os consultores</SelectItem>
                  {consultants.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Cliente / Empresa</Label>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="h-9 w-48 text-xs">
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas as empresas</SelectItem>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Status Auditoria</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="default"
                size="sm"
                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                disabled={approveBatchMut.isPending}
                onClick={() => approveBatchMut.mutate(selectedIds)}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Aprovar Selecionados ({selectedIds.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                if (selectedIds.length === hours.length) setSelectedIds([]);
                else setSelectedIds(hours.map((h: any) => h.id));
              }}
            >
              {selectedIds.length === hours.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Grid de Auditoria */}
      <Card className="divide-y overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando lançamentos…</div>
        ) : hours.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento encontrado para o período e filtros selecionados.
          </div>
        ) : (
          hours.map((h: any) => {
            const isApproved = h.audit_status === "aprovado";
            const isAdjusted = !!h.adjusted_by_manager;
            const expenses = h.work_hour_expenses ?? [];
            return (
              <div
                key={h.id}
                className={cn(
                  "flex items-start gap-3 p-3.5 text-sm transition-colors",
                  isAdjusted && "bg-amber-500/5 border-l-4 border-l-amber-500",
                )}
              >
                <Checkbox
                  checked={selectedIds.includes(h.id)}
                  onCheckedChange={(checked) =>
                    setSelectedIds((prev) =>
                      checked ? [...prev, h.id] : prev.filter((id) => id !== h.id),
                    )
                  }
                  className="mt-1"
                />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{fmtDate(h.work_date)}</span>
                    <Badge variant="secondary" className="font-bold">
                      {fmtHours(h.hours)}
                    </Badge>
                    <Badge variant="outline" className="font-medium text-xs">
                      {h.responsible}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {h.companies?.name || "Sem empresa"}
                    </span>

                    {/* Status Remuneração */}
                    {h.is_remunerated === false ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20 font-bold">
                        Não Remunerada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 font-bold">
                        Remunerada
                      </Badge>
                    )}

                    {/* Status de Auditoria */}
                    {isApproved ? (
                      <Badge className="bg-emerald-500 text-white text-[10px] gap-1 py-0">
                        <CheckCircle2 className="h-3 w-3" /> Aprovado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] py-0 text-muted-foreground">
                        Pendente Auditoria
                      </Badge>
                    )}

                    {isAdjusted && (
                      <Badge variant="destructive" className="text-[10px] py-0">
                        Ajustado pela Gestão
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground break-words">
                    {h.description || h.notes || "Sem descrição"}
                  </p>

                  {/* Detalhes de Despesas */}
                  {expenses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {expenses.map((exp: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-[10px] gap-1">
                          <Receipt className="h-3 w-3 text-primary" />
                          {exp.category?.toUpperCase() || "DESPESA"}: {brl(Number(exp.amount))}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {isAdjusted && h.manager_note && (
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                      💬 Justificativa da Gestão: {h.manager_note}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs shrink-0"
                  onClick={() =>
                    setEditingItem({
                      id: h.id,
                      responsible: h.responsible,
                      hours: Number(h.hours),
                      is_remunerated: h.is_remunerated !== false,
                      audit_status: h.audit_status || "pendente",
                      manager_note: h.manager_note || "",
                    })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" /> Auditar
                </Button>
              </div>
            );
          })
        )}
      </Card>

      {/* Modal de Auditoria do Lançamento */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Auditar Lançamento de Horas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-muted-foreground">Consultor</Label>
                <Input value={editingItem.responsible} readOnly disabled className="h-10" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade de Horas</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    value={editingItem.hours}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, hours: Number(e.target.value) })
                    }
                    className="h-10"
                  />
                </div>
                <div>
                  <Label>Status de Auditoria</Label>
                  <Select
                    value={editingItem.audit_status}
                    onValueChange={(v) => setEditingItem({ ...editingItem, audit_status: v })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovado">Pronto / Aprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Toggle de Remuneração */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Hora Remunerada?</Label>
                  <p className="text-xs text-muted-foreground">
                    Define se este atendimento será pago ao consultor no fechamento.
                  </p>
                </div>
                <Switch
                  checked={editingItem.is_remunerated}
                  onCheckedChange={(checked) =>
                    setEditingItem({ ...editingItem, is_remunerated: checked })
                  }
                />
              </div>

              <div>
                <Label>Justificativa do Ajuste (Visível para o Consultor) *</Label>
                <Textarea
                  rows={2}
                  placeholder="Ex.: Ajustado conforme alinhamento com cliente ou descaracterizado como mentoria remunerada..."
                  value={editingItem.manager_note}
                  onChange={(e) => setEditingItem({ ...editingItem, manager_note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  updateItemMut.mutate({
                    id: editingItem.id,
                    hours: editingItem.hours,
                    is_remunerated: editingItem.is_remunerated,
                    audit_status: editingItem.audit_status,
                    manager_note: editingItem.manager_note,
                  })
                }
                disabled={updateItemMut.isPending}
              >
                {updateItemMut.isPending ? "Salvando..." : "Salvar Ajuste"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: FECHAMENTO DE EQUIPE & NFs (Conta Corrente)
// ══════════════════════════════════════════════════════════════════════════════

function FechamentoSection({ selectedMonth }: { selectedMonth: string }) {
  const qc = useQueryClient();
  const getClosingFn = useServerFn(getTeamClosingData);
  const closeMonthFn = useServerFn(closeConsultantMonth);
  const toggleNfFn = useServerFn(toggleNfReceived);

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["team-closing", selectedMonth],
    queryFn: () => getClosingFn({ data: { month_year: selectedMonth } }),
  });

  const toggleNfMut = useMutation({
    mutationFn: (payload: any) => toggleNfFn({ data: payload }),
    onSuccess: () => {
      toast.success("Status de NF atualizado!");
      qc.invalidateQueries({ queryKey: ["team-closing"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao alterar status de NF"),
  });

  const closeMonthMut = useMutation({
    mutationFn: (payload: any) => closeMonthFn({ data: payload }),
    onSuccess: () => {
      toast.success("Fechamento do consultor gravado com snapshot imutável!");
      qc.invalidateQueries({ queryKey: ["team-closing"] });
      qc.invalidateQueries({ queryKey: ["maia-dre"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao fechar mês"),
  });

  const totals = useMemo(() => {
    return (team as any[]).reduce(
      (acc, c) => {
        acc.totalHours += Number(c.totalHours || 0);
        acc.totalPayable += Number(c.totalPayable || 0);
        acc.reimbursements += Number(c.expenseReimbursement || 0);
        if (!c.nfReceived) acc.nfPendingCount += 1;
        return acc;
      },
      { totalHours: 0, totalPayable: 0, reimbursements: 0, nfPendingCount: 0 },
    );
  }, [team]);

  const [notifyModalConsultant, setNotifyModalConsultant] = useState<any>(null);
  const [notifyMsg, setNotifyMsg] = useState("");

  function openNfNotification(c: any) {
    setNotifyModalConsultant(c);
    setNotifyMsg(
      `Olá, ${c.fullName}! Lembramos que o envio da sua Nota Fiscal referente ao fechamento da Maia do mês ${selectedMonth} (Valor a receber: ${brl(c.totalPayable)}) ainda está pendente. Por gentileza, nos envie a NF para liberação do pagamento. Obrigado!`,
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo do Fechamento */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total a Pagar Equipe</p>
          <p className="text-xl font-bold text-primary tabular-nums">{brl(totals.totalPayable)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Horas Remuneradas</p>
          <p className="text-xl font-bold tabular-nums">{fmtHours(totals.totalHours)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Reembolsos de Despesas</p>
          <p className="text-xl font-bold tabular-nums">{brl(totals.reimbursements)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">NFs Pendentes</p>
          <p
            className={cn(
              "text-xl font-bold tabular-nums",
              totals.nfPendingCount > 0 ? "text-amber-600" : "text-emerald-600",
            )}
          >
            {totals.nfPendingCount}
          </p>
        </Card>
      </div>

      {/* Grid de Consultores */}
      <Card className="divide-y overflow-hidden">
        <div className="hidden grid-cols-12 gap-2 bg-muted/40 p-3 text-xs font-bold uppercase text-muted-foreground lg:grid">
          <div className="col-span-3">Consultor / Regime</div>
          <div className="col-span-2 text-right">Horas / Mínimo</div>
          <div className="col-span-2 text-right">Honorários Base</div>
          <div className="col-span-1 text-right">Reembolsos</div>
          <div className="col-span-2 text-right">Total a Pagar</div>
          <div className="col-span-2 text-center">NF / Fechamento</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando fechamento da equipe…</div>
        ) : team.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum consultor cadastrado.</div>
        ) : (
          team.map((c: any) => {
            const isContaCorrente = c.regime === "conta_corrente";
            return (
              <div
                key={c.userId}
                className="grid grid-cols-1 gap-2 p-3 text-sm lg:grid-cols-12 lg:items-center hover:bg-muted/20"
              >
                <div className="col-span-3 min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.fullName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] capitalize font-medium">
                      {c.regime.replace("_", " ")}
                    </Badge>
                    {isContaCorrente && c.deficitHours > 0 && (
                      <Badge variant="destructive" className="text-[10px] py-0">
                        Déficit {fmtHours(c.deficitHours)}
                      </Badge>
                    )}
                    {c.bankHours !== 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        Banco: {fmtHours(c.bankHours)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-span-2 lg:text-right">
                  <span className="text-xs text-muted-foreground lg:hidden">Horas: </span>
                  <span className="font-medium tabular-nums">{fmtHours(c.totalHours)}</span>
                  {isContaCorrente && (
                    <p className="text-[11px] text-muted-foreground">
                      Mínimo: {fmtHours(Number(c.contractSnapshot?.min_hours || 0))}
                    </p>
                  )}
                </div>

                <div className="col-span-2 lg:text-right">
                  <span className="text-xs text-muted-foreground lg:hidden">Base: </span>
                  <span className="font-medium tabular-nums">{brl(c.baseAmount)}</span>
                  {c.extraAmount > 0 && (
                    <p className="text-[11px] text-emerald-600 font-medium">
                      + Extra: {brl(c.extraAmount)}
                    </p>
                  )}
                </div>

                <div className="col-span-1 lg:text-right">
                  <span className="text-xs text-muted-foreground lg:hidden">Reembolso: </span>
                  <span className="tabular-nums text-xs">{brl(c.expenseReimbursement)}</span>
                </div>

                <div className="col-span-2 lg:text-right">
                  <span className="text-xs text-muted-foreground lg:hidden">Total a pagar: </span>
                  <span className="font-bold text-primary tabular-nums text-base">
                    {brl(c.totalPayable)}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-between lg:justify-center gap-2">
                  {/* NF Recebida toggle */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        toggleNfMut.mutate({
                          closing_id: c.closingId,
                          user_id: c.userId,
                          month_year: selectedMonth,
                          nf_received: !c.nfReceived,
                        })
                      }
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-bold transition-all",
                        c.nfReceived
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300",
                      )}
                    >
                      {c.nfReceived ? "NF: Sim" : "NF: Não"}
                    </button>
                    {!c.nfReceived && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/30"
                        title="Disparar notificação de cobrança de NF para o consultor"
                        onClick={() => openNfNotification(c)}
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Fechamento imutável */}
                  {c.isClosed ? (
                    <Badge variant="secondary" className="gap-1 text-[10px] py-0.5 text-muted-foreground">
                      <Lock className="h-3 w-3" /> Fechado
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
                      disabled={closeMonthMut.isPending}
                      onClick={() =>
                        closeMonthMut.mutate({
                          user_id: c.userId,
                          month_year: selectedMonth,
                          regime: c.regime,
                          contract_snapshot: c.contractSnapshot,
                          total_hours: c.totalHours,
                          min_hours_snapshot: Number(c.contractSnapshot?.min_hours || 0),
                          deficit_hours: c.deficitHours,
                          base_amount: c.baseAmount,
                          extra_amount: c.extraAmount,
                          expense_reimbursement: c.expenseReimbursement,
                          total_payable: c.totalPayable,
                          nf_received: c.nfReceived,
                        })
                      }
                    >
                      Fechar Mês
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Modal de Disparo de Notificação de NF */}
      {notifyModalConsultant && (
        <Dialog
          open={!!notifyModalConsultant}
          onOpenChange={(open) => !open && setNotifyModalConsultant(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                Notificar Consultor sobre Nota Fiscal
              </DialogTitle>
              <DialogDescription>
                Dispare uma cobrança formal de Nota Fiscal diretamente por WhatsApp ou E-mail.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <p>
                  <strong className="text-foreground">Consultor:</strong> {notifyModalConsultant.fullName}
                </p>
                <p>
                  <strong className="text-foreground">WhatsApp:</strong>{" "}
                  {notifyModalConsultant.whatsapp || "Não cadastrado"}
                </p>
                <p>
                  <strong className="text-foreground">E-mail:</strong> {notifyModalConsultant.email}
                </p>
                <p>
                  <strong className="text-foreground">Valor a Receber:</strong>{" "}
                  <span className="font-bold text-primary">{brl(notifyModalConsultant.totalPayable)}</span>
                </p>
                <p>
                  <strong className="text-foreground">Competência:</strong> {selectedMonth}
                </p>
              </div>

              <div>
                <Label className="text-xs">Mensagem de Cobrança</Label>
                <Textarea
                  rows={4}
                  className="text-xs mt-1"
                  value={notifyMsg}
                  onChange={(e) => setNotifyMsg(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-1 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(notifyMsg);
                  toast.success("Mensagem copiada para a área de transferência!");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar Mensagem
              </Button>

              <Button
                type="button"
                variant="outline"
                className="gap-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                onClick={() => {
                  const subject = `Envio de NF - Fechamento Maia ${selectedMonth}`;
                  window.open(
                    `mailto:${notifyModalConsultant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(notifyMsg)}`,
                    "_blank",
                  );
                }}
              >
                <Mail className="h-3.5 w-3.5" /> Enviar por E-mail
              </Button>

              <Button
                type="button"
                className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  const raw = (notifyModalConsultant.whatsapp || "").replace(/\D/g, "");
                  const phone = raw ? (raw.startsWith("55") ? raw : "55" + raw) : "";
                  window.open(
                    `https://wa.me/${phone}?text=${encodeURIComponent(notifyMsg)}`,
                    "_blank",
                  );
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Disparar WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: DRE CORPORATIVO
// ══════════════════════════════════════════════════════════════════════════════

function DreSection({ selectedMonth }: { selectedMonth: string }) {
  const qc = useQueryClient();
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costForm, setCostForm] = useState({
    entry_type: "custo_fixo" as "custo_fixo" | "custo_variavel",
    description: "",
    amountStr: "",
  });

  const getDreFn = useServerFn(getMaiaDreData);
  const saveCostFn = useServerFn(saveMaiaDreEntry);
  const deleteCostFn = useServerFn(deleteMaiaDreEntry);
  const cloneCostsFn = useServerFn(cloneDreEntriesFromPreviousMonth);

  const { data: dre, isLoading } = useQuery({
    queryKey: ["maia-dre", selectedMonth],
    queryFn: () => getDreFn({ data: { month_year: selectedMonth } }),
  });

  const saveCostMut = useMutation({
    mutationFn: () => {
      const clean = (costForm.amountStr || "").replace(/[^\d.,]/g, "").replace(",", ".");
      const amount = parseFloat(clean) || 0;
      if (amount <= 0) throw new Error("Informe um valor válido maior que zero.");
      return saveCostFn({
        data: {
          month_year: selectedMonth,
          entry_type: costForm.entry_type,
          description: costForm.description.trim(),
          amount,
        },
      });
    },
    onSuccess: () => {
      toast.success("Custo adicionado ao DRE!");
      setCostModalOpen(false);
      setCostForm({ entry_type: "custo_fixo", description: "", amountStr: "" });
      qc.invalidateQueries({ queryKey: ["maia-dre"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar custo"),
  });

  const deleteCostMut = useMutation({
    mutationFn: (id: string) => deleteCostFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Custo removido!");
      qc.invalidateQueries({ queryKey: ["maia-dre"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover custo"),
  });

  const cloneCostsMut = useMutation({
    mutationFn: () =>
      cloneCostsFn({ data: { current_month_year: selectedMonth } }),
    onSuccess: (res) => {
      toast.success(`${res.count} custos importados do mês anterior!`);
      qc.invalidateQueries({ queryKey: ["maia-dre"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao importar custos"),
  });

  return (
    <div className="space-y-4">
      {/* Resumo do DRE */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Faturamento Bruto</p>
          <p className="text-xl font-bold tabular-nums">{brl(dre?.grossRevenue ?? 0)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">
            Impostos ({dre?.totalTaxRatePercent?.toFixed(1)}%)
          </p>
          <p className="text-xl font-bold text-amber-600 tabular-nums">
            (-) {brl(dre?.taxesDeduction ?? 0)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Receita Líquida</p>
          <p className="text-xl font-bold text-foreground tabular-nums">
            {brl(dre?.netRevenue ?? 0)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Custo da Equipe</p>
          <p className="text-xl font-bold text-destructive tabular-nums">
            (-) {brl((dre?.teamLaborCost ?? 0) + (dre?.expenseReimbursements ?? 0))}
          </p>
        </Card>
        <Card
          className={cn(
            "p-3 border-2",
            (dre?.operatingProfit ?? 0) >= 0
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-red-500/40 bg-red-500/5",
          )}
        >
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">
            Lucro Operacional Líquido
          </p>
          <p
            className={cn(
              "text-xl font-black tabular-nums",
              (dre?.operatingProfit ?? 0) >= 0 ? "text-emerald-600" : "text-destructive",
            )}
          >
            {brl(dre?.operatingProfit ?? 0)}
          </p>
        </Card>
      </div>

      {/* Ações do DRE */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setCostModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Adicionar Custo (Fixo / Variável)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={cloneCostsMut.isPending}
            onClick={() => cloneCostsMut.mutate()}
          >
            <Copy className="h-4 w-4" /> Importar Custos do Mês Anterior
          </Button>
        </div>

        <Button
          className="h-9 gap-1.5 bg-primary text-primary-foreground font-semibold"
          disabled={isLoading || !dre}
          onClick={() => dre && exportMaiaDrePdf(dre)}
        >
          <FileDown className="h-4 w-4" /> Gerar PDF de Fechamento Maia
        </Button>
      </div>

      {/* Tabela do DRE Estruturado */}
      <Card className="divide-y overflow-hidden text-sm">
        <div className="flex justify-between p-3.5 bg-muted/40 font-bold">
          <span>1. Faturamento Bruto de Serviços</span>
          <span className="tabular-nums">{brl(dre?.grossRevenue ?? 0)}</span>
        </div>
        <div className="flex justify-between p-3.5 pl-6 text-xs text-muted-foreground">
          <span>
            (-) Dedução de Impostos (
            {dre?.taxes?.map((t: any) => `${t.name}: ${t.rate_percent}%`).join(" · ") || "0%"})
          </span>
          <span className="tabular-nums text-destructive">(-) {brl(dre?.taxesDeduction ?? 0)}</span>
        </div>
        <div className="flex justify-between p-3.5 font-bold bg-muted/20">
          <span>2. Receita Operacional Líquida</span>
          <span className="tabular-nums text-foreground">{brl(dre?.netRevenue ?? 0)}</span>
        </div>

        <div className="flex justify-between p-3.5 font-bold bg-muted/40">
          <span>3. Custos Operacionais de Equipe</span>
          <span className="tabular-nums text-destructive">
            (-) {brl((dre?.teamLaborCost ?? 0) + (dre?.expenseReimbursements ?? 0))}
          </span>
        </div>
        <div className="flex justify-between p-3.5 pl-6 text-xs text-muted-foreground">
          <span>(-) Honorários dos Consultores (Fechamentos Aprovados)</span>
          <span className="tabular-nums">(-) {brl(dre?.teamLaborCost ?? 0)}</span>
        </div>
        <div className="flex justify-between p-3.5 pl-6 text-xs text-muted-foreground">
          <span>(-) Reembolsos de Despesas (Alimentação, Deslocamento, etc.)</span>
          <span className="tabular-nums">(-) {brl(dre?.expenseReimbursements ?? 0)}</span>
        </div>

        {/* Custos Fixos */}
        <div className="flex justify-between p-3.5 font-bold bg-muted/40">
          <span>4. Despesas Fixas Corporativas</span>
          <span className="tabular-nums text-destructive">(-) {brl(dre?.totalFixedCosts ?? 0)}</span>
        </div>
        {(dre?.fixedCosts ?? []).map((f: any) => (
          <div key={f.id} className="flex items-center justify-between p-3 pl-6 text-xs hover:bg-muted/10">
            <span>{f.description}</span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-muted-foreground">(-) {brl(f.amount)}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={() => deleteCostMut.mutate(f.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {/* Custos Variáveis */}
        <div className="flex justify-between p-3.5 font-bold bg-muted/40">
          <span>5. Despesas Variáveis Corporativas</span>
          <span className="tabular-nums text-destructive">(-) {brl(dre?.totalVariableCosts ?? 0)}</span>
        </div>
        {(dre?.variableCosts ?? []).map((v: any) => (
          <div key={v.id} className="flex items-center justify-between p-3 pl-6 text-xs hover:bg-muted/10">
            <span>{v.description}</span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-muted-foreground">(-) {brl(v.amount)}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={() => deleteCostMut.mutate(v.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {/* Lucro Operacional Líquido */}
        <div
          className={cn(
            "flex justify-between p-4 font-black text-base",
            (dre?.operatingProfit ?? 0) >= 0
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 text-destructive",
          )}
        >
          <span>LUCRO OPERACIONAL LÍQUIDO DO PERÍODO</span>
          <span className="tabular-nums text-lg">{brl(dre?.operatingProfit ?? 0)}</span>
        </div>
      </Card>

      {/* Modal Adicionar Custo */}
      <Dialog open={costModalOpen} onOpenChange={setCostModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Custo ao DRE</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Categoria do Custo</Label>
              <Select
                value={costForm.entry_type}
                onValueChange={(v: any) => setCostForm({ ...costForm, entry_type: v })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custo_fixo">Custo Fixo (ex: Aluguel, Sistemas, Contabilidade)</SelectItem>
                  <SelectItem value="custo_variavel">Custo Variável (ex: Viagem diretoria, Material)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                placeholder="Ex.: Licença de Softwares ou Assessoria Jurídica"
                value={costForm.description}
                onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                placeholder="Ex.: 1500,00 ou 250.50"
                value={costForm.amountStr}
                onChange={(e) => setCostForm({ ...costForm, amountStr: e.target.value })}
                className="h-10 font-medium tabular-nums"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCostModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !costForm.description.trim() ||
                !costForm.amountStr.trim() ||
                saveCostMut.isPending
              }
              onClick={() => saveCostMut.mutate()}
            >
              Adicionar ao DRE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 4: CONFIGURAÇÕES DE IMPOSTOS E CONTRATOS
// ══════════════════════════════════════════════════════════════════════════════

function ConfiguracoesSection({ isSuperadmin }: { isSuperadmin?: boolean }) {
  const qc = useQueryClient();
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<any>(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);

  const listTaxesFn = useServerFn(listMaiaTaxes);
  const saveTaxFn = useServerFn(saveMaiaTax);
  const deleteTaxFn = useServerFn(deleteMaiaTax);

  const listContractsFn = useServerFn(listConsultantContracts);
  const saveContractFn = useServerFn(saveConsultantContract);

  const { data: taxes = [] } = useQuery({
    queryKey: ["maia-taxes"],
    queryFn: () => listTaxesFn(),
  });

  const { data: consultants = [] } = useQuery({
    queryKey: ["consultant-contracts"],
    queryFn: () => listContractsFn(),
    enabled: !!isSuperadmin,
  });

  const saveTaxMut = useMutation({
    mutationFn: (payload: any) => saveTaxFn({ data: payload }),
    onSuccess: () => {
      toast.success("Configuração de imposto salva!");
      setTaxModalOpen(false);
      setEditingTax(null);
      qc.invalidateQueries({ queryKey: ["maia-taxes"] });
      qc.invalidateQueries({ queryKey: ["maia-dre"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar imposto"),
  });

  const deleteTaxMut = useMutation({
    mutationFn: (id: string) => deleteTaxFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Imposto excluído!");
      qc.invalidateQueries({ queryKey: ["maia-taxes"] });
      qc.invalidateQueries({ queryKey: ["maia-dre"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir imposto"),
  });

  const saveContractMut = useMutation({
    mutationFn: (payload: any) => saveContractFn({ data: payload }),
    onSuccess: () => {
      toast.success("Contrato do consultor atualizado com sucesso!");
      setContractModalOpen(false);
      setEditingContract(null);
      qc.invalidateQueries({ queryKey: ["consultant-contracts"] });
      qc.invalidateQueries({ queryKey: ["team-closing"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar contrato"),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Painel de Impostos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Configuração de Impostos</CardTitle>
              <CardDescription>
                Alíquotas deduzidas automaticamente sobre o faturamento bruto no DRE
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="gap-1 text-xs"
              onClick={() => {
                setEditingTax({ name: "", rate_percent: 6.0, is_active: true });
                setTaxModalOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Imposto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          {taxes.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nenhum imposto cadastrado.
            </p>
          ) : (
            taxes.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">Alíquota: {t.rate_percent}%</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.is_active ? "default" : "secondary"}>
                    {t.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => confirm("Excluir este imposto?") && deleteTaxMut.mutate(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Painel de Contratos dos Consultores (Sigiloso - SuperAdmin) */}
      {!isSuperadmin ? (
        <Card className="border-dashed bg-muted/20 flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="mt-3 text-base font-bold">Contratos de Consultores (Sigiloso)</CardTitle>
          <CardDescription className="mt-1 text-xs max-w-sm">
            Os honorários, regimes e termos contratuais dos consultores são estritamente confidenciais e restritos ao <strong>SuperAdmin</strong> da Maia.
          </CardDescription>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-lg">Contratos de Consultores (Sigiloso)</CardTitle>
              <CardDescription>
                Parâmetros de remuneração restritos exclusivamente ao SuperAdmin
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            {consultants.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nenhum consultor cadastrado.
              </p>
            ) : (
              consultants.map((c: any) => {
                const contract = c.contract;
                const regime = contract.payment_regime || "hora";
                return (
                  <div key={c.userId} className="flex items-center justify-between py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{c.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        Regime:{" "}
                        <span className="font-medium text-foreground capitalize">
                          {regime.replace("_", " ")}
                        </span>
                        {regime === "fixo" && ` · ${brl(contract.monthly_fixed_amount)}/mês`}
                        {regime === "hora" && ` · ${brl(contract.hourly_rate)}/h`}
                        {regime === "conta_corrente" &&
                          ` · Piso: ${brl(contract.base_floor_amount)} (${fmtHours(contract.min_hours)}) + ${brl(contract.extra_hour_rate)}/h extra`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs ml-2"
                      onClick={() => {
                        setEditingContract({
                          user_id: c.userId,
                          fullName: c.fullName,
                          payment_regime: contract.payment_regime || "hora",
                          monthly_fixed_amount: contract.monthly_fixed_amount || 0,
                          hourly_rate: contract.hourly_rate || 0,
                          base_floor_amount: contract.base_floor_amount || 0,
                          min_hours: contract.min_hours || 0,
                          extra_hour_rate: contract.extra_hour_rate || 0,
                          active: contract.active !== false,
                          notes: contract.notes || "",
                        });
                        setContractModalOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Contrato
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Imposto */}
      {taxModalOpen && editingTax && (
        <Dialog open={taxModalOpen} onOpenChange={setTaxModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Configurar Imposto</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Nome do Imposto</Label>
                <Input
                  placeholder="Ex.: Simples Nacional, ISS, PIS/COFINS..."
                  value={editingTax.name}
                  onChange={(e) => setEditingTax({ ...editingTax, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Alíquota (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingTax.rate_percent}
                  onChange={(e) =>
                    setEditingTax({ ...editingTax, rate_percent: Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm font-semibold">Imposto Ativo</Label>
                <Switch
                  checked={editingTax.is_active}
                  onCheckedChange={(c) => setEditingTax({ ...editingTax, is_active: c })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaxModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!editingTax.name.trim() || saveTaxMut.isPending}
                onClick={() => saveTaxMut.mutate(editingTax)}
              >
                Salvar Imposto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Contrato do Consultor */}
      {contractModalOpen && editingContract && (
        <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Contrato de Remuneração: {editingContract.fullName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Regime de Pagamento</Label>
                <Select
                  value={editingContract.payment_regime}
                  onValueChange={(v) =>
                    setEditingContract({ ...editingContract, payment_regime: v })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Fixo Mensal</SelectItem>
                    <SelectItem value="hora">Por Hora Trabalhada</SelectItem>
                    <SelectItem value="conta_corrente">Conta Corrente (Piso + Mínimo + Extra)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campos se FIXO */}
              {editingContract.payment_regime === "fixo" && (
                <div>
                  <Label>Valor Mensal Fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingContract.monthly_fixed_amount}
                    onChange={(e) =>
                      setEditingContract({
                        ...editingContract,
                        monthly_fixed_amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
              )}

              {/* Campos se POR HORA */}
              {editingContract.payment_regime === "hora" && (
                <div>
                  <Label>Valor da Hora (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingContract.hourly_rate}
                    onChange={(e) =>
                      setEditingContract({
                        ...editingContract,
                        hourly_rate: Number(e.target.value),
                      })
                    }
                  />
                </div>
              )}

              {/* Campos se CONTA CORRENTE */}
              {editingContract.payment_regime === "conta_corrente" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Piso Base (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingContract.base_floor_amount}
                      onChange={(e) =>
                        setEditingContract({
                          ...editingContract,
                          base_floor_amount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Horas Mínimas</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={editingContract.min_hours}
                      onChange={(e) =>
                        setEditingContract({
                          ...editingContract,
                          min_hours: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valor Hora Extra (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingContract.extra_hour_rate}
                      onChange={(e) =>
                        setEditingContract({
                          ...editingContract,
                          extra_hour_rate: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Observações Internas (Sigilosas)</Label>
                <Textarea
                  rows={2}
                  value={editingContract.notes}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setContractModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={saveContractMut.isPending}
                onClick={() => saveContractMut.mutate(editingContract)}
              >
                Salvar Contrato
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
