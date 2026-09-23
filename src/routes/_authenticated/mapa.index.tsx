import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMapaData,
  saveMapaItem,
  deleteMapaItem,
  type PillarMeta,
  type MapaItem,
  type MapaCompanyInfo,
} from "@/lib/mapa.functions";
import { exportMapaPdf } from "@/lib/mapa-pdf";
import { exportMapaExcel } from "@/lib/mapa-excel";
import { listCompanies } from "@/lib/interviews.functions";
import { useActiveCompany } from "@/lib/active-company";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Map,
  Building2,
  Plus,
  Minus,
  Trash2,
  Pencil,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CheckCircle2,
  Clock,
  Circle,
  Calendar,
  User,
  Layers,
  ArrowRight,
  CornerDownRight,
  TrendingUp,
  Flame,
  AlertCircle,
  FolderTree,
  Download,
  FileSpreadsheet,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mapa/")({
  component: MapaPage,
  head: () => ({
    meta: [
      { title: "Mapa Estratégico | JARVIS" },
      {
        name: "description",
        content: "Mapa estratégico da consultoria por pilares: Pessoas, Processos e Negócios com diretrizes e desdobramentos.",
      },
    ],
  }),
});

type ItemModalMode = "diretriz" | "desdobramento" | "edit";

type ItemFormState = {
  id?: string;
  title: string;
  problem: string;
  cause: string;
  expected_result: string;
  responsible: string;
  sector: string;
  origin: string;
  status: "aberto" | "em_andamento" | "concluido" | "nao_sera_feito";
  demand_type: string;
  parent_id: string | null;
  item_type: "diretriz" | "acao" | "desdobramento";
  progress_pct: number;
  due_date: string;
  observations: string;
  custom_pillar: string;
  gravity: number;
  urgency: number;
  trend: number;
};

const INITIAL_FORM: ItemFormState = {
  title: "",
  problem: "",
  cause: "",
  expected_result: "",
  responsible: "",
  sector: "",
  origin: "",
  status: "aberto",
  demand_type: "processo",
  parent_id: null,
  item_type: "diretriz",
  progress_pct: 0,
  due_date: "",
  observations: "",
  custom_pillar: "",
  gravity: 3,
  urgency: 3,
  trend: 3,
};

function statusInfo(status: string) {
  if (status === "concluido") {
    return {
      label: "Concluído",
      badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: CheckCircle2,
      dotClass: "bg-emerald-500",
    };
  }
  if (status === "em_andamento") {
    return {
      label: "Em andamento",
      badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: Clock,
      dotClass: "bg-blue-500",
    };
  }
  if (status === "nao_sera_feito") {
    return {
      label: "Não será feito",
      badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      icon: AlertCircle,
      dotClass: "bg-rose-500",
    };
  }
  return {
    label: "A iniciar",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    icon: Circle,
    dotClass: "bg-slate-400",
  };
}

function tierOf(score: number) {
  if (score >= 75) return { label: "Crítico", chip: "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400" };
  if (score >= 40) return { label: "Alto", chip: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400" };
  if (score >= 15) return { label: "Médio", chip: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400" };
  return { label: "Baixo", chip: "bg-muted text-muted-foreground border-border" };
}

function GutStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.min(5, Math.max(1, v)));
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-stretch gap-1 mt-1">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => set(value - 1)} disabled={value <= 1} aria-label={`Diminuir ${label}`}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Input
          type="number"
          min={1}
          max={5}
          value={value}
          onChange={(e) => set(Number(e.target.value) || 1)}
          className="w-full text-center tabular-nums h-8 text-xs font-semibold"
        />
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => set(value + 1)} disabled={value >= 5} aria-label={`Aumentar ${label}`}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function MapaPage() {
  const qc = useQueryClient();
  const { companyId: activeCompanyId, setCompanyId: setActiveCompanyId } = useActiveCompany();
  const [companyId, setCompanyId] = useState<string | null>(activeCompanyId ?? null);

  // Sync active company from global context
  useEffect(() => {
    if (activeCompanyId && !companyId) {
      setCompanyId(activeCompanyId);
    }
  }, [activeCompanyId, companyId]);

  // Server functions
  const getMapaFn = useServerFn(getMapaData);
  const saveItemFn = useServerFn(saveMapaItem);
  const deleteItemFn = useServerFn(deleteMapaItem);
  const listCompaniesFn = useServerFn(listCompanies);

  // Queries
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompaniesFn(),
  });

  const { data: mapaData, isLoading: loadingMapa, isFetching } = useQuery({
    queryKey: ["mapa", companyId],
    queryFn: () => (companyId ? getMapaFn({ data: { company_id: companyId } }) : null),
    enabled: !!companyId,
  });

  // Navigation & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<ItemModalMode>("diretriz");
  const [parentItemForSub, setParentItemForSub] = useState<MapaItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(INITIAL_FORM);

  const [pilarModalOpen, setPilarModalOpen] = useState(false);
  const [newPilarName, setNewPilarName] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MapaItem | null>(null);

  // Detail expansion for action rows
  const [expandedActionDetails, setExpandedActionDetails] = useState<Record<string, boolean>>({});
  function toggleActionDetail(id: string) {
    setExpandedActionDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Export state
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  async function handleExportPdf() {
    if (!mapaData?.company || !mapaData.pillars) return;
    setExportingPdf(true);
    try {
      await exportMapaPdf({
        company: mapaData.company,
        pillars: mapaData.pillars,
        treeByPillar: mapaData.treeByPillar,
        items: mapaData.items,
      });
      toast.success("PDF exportado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao exportar PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  function handleExportExcel() {
    if (!mapaData?.company || !mapaData.pillars) return;
    setExportingExcel(true);
    try {
      exportMapaExcel({
        company: mapaData.company,
        pillars: mapaData.pillars,
        treeByPillar: mapaData.treeByPillar,
        items: mapaData.items,
      });
      toast.success("Excel exportado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao exportar Excel");
    } finally {
      setExportingExcel(false);
    }
  }

  // Auto-expand all directives on first load
  useEffect(() => {
    if (mapaData?.items) {
      const initExp: Record<string, boolean> = {};
      mapaData.items.forEach((item) => {
        initExp[item.id] = true;
      });
      // also expand pillars
      mapaData.pillars.forEach((p) => {
        initExp[`pilar_${p.key}`] = true;
      });
      setExpandedNodes((prev) => (Object.keys(prev).length === 0 ? initExp : prev));
    }
  }, [mapaData]);

  // Expand / Collapse all
  function handleExpandAll() {
    if (!mapaData) return;
    const exp: Record<string, boolean> = {};
    mapaData.items.forEach((item) => {
      exp[item.id] = true;
    });
    mapaData.pillars.forEach((p) => {
      exp[`pilar_${p.key}`] = true;
    });
    setExpandedNodes(exp);
  }

  function handleCollapseAll() {
    setExpandedNodes({});
  }

  function toggleNode(key: string) {
    setExpandedNodes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: any) => saveItemFn({ data: payload }),
    onSuccess: () => {
      toast.success("Item salvo com sucesso!");
      setItemModalOpen(false);
      setPilarModalOpen(false);
      qc.invalidateQueries({ queryKey: ["mapa", companyId] });
      qc.invalidateQueries({ queryKey: ["action_plans", companyId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar item");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteItemFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Item excluído com sucesso!");
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      qc.invalidateQueries({ queryKey: ["mapa", companyId] });
      qc.invalidateQueries({ queryKey: ["action_plans", companyId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao excluir item");
    },
  });

  // Modal Handlers
  function handleOpenNewDiretriz(pillarKey?: string) {
    setItemModalMode("diretriz");
    setParentItemForSub(null);
    const standardKeys = ["pessoas", "processo", "negocio"];
    const isCustom = pillarKey && !standardKeys.includes(pillarKey.toLowerCase());
    setItemForm({
      ...INITIAL_FORM,
      demand_type: pillarKey || "processo",
      custom_pillar: isCustom ? pillarKey.toUpperCase() : "",
      item_type: "diretriz",
    });
    setItemModalOpen(true);
  }

  function handleOpenNewSubAction(parent: MapaItem) {
    setItemModalMode("desdobramento");
    setParentItemForSub(parent);
    const standardKeys = ["pessoas", "processo", "negocio"];
    const isCustom = parent.demand_type && !standardKeys.includes(parent.demand_type.toLowerCase());
    setItemForm({
      ...INITIAL_FORM,
      demand_type: parent.demand_type,
      parent_id: parent.id,
      item_type: "desdobramento",
      custom_pillar: parent.custom_pillar || (isCustom ? parent.demand_type.toUpperCase() : ""),
      sector: parent.sector || "",
      responsible: parent.responsible || "",
    });
    setItemModalOpen(true);
  }

  function handleOpenEdit(item: MapaItem) {
    setItemModalMode("edit");
    setParentItemForSub(null);
    const standardKeys = ["pessoas", "processo", "negocio"];
    const isCustom = item.demand_type && !standardKeys.includes(item.demand_type.toLowerCase());
    setItemForm({
      id: item.id,
      title: item.title,
      problem: item.problem || "",
      cause: item.cause || "",
      expected_result: item.expected_result || "",
      responsible: item.responsible || "",
      sector: item.sector || "",
      origin: item.origin || "",
      status: item.status,
      demand_type: item.demand_type,
      parent_id: item.parent_id || null,
      item_type: item.item_type,
      progress_pct: item.progress_pct,
      due_date: item.due_date || "",
      observations: item.observations || "",
      custom_pillar: item.custom_pillar || (isCustom ? item.demand_type.toUpperCase() : ""),
      gravity: item.gravity ?? 3,
      urgency: item.urgency ?? 3,
      trend: item.trend ?? 3,
    });
    setItemModalOpen(true);
  }

  function handleOpenDelete(item: MapaItem) {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  }

  function handleSaveItem() {
    if (!companyId) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }
    if (!itemForm.title.trim()) {
      toast.error("Informe o título do item");
      return;
    }

    saveMutation.mutate({
      id: itemForm.id,
      company_id: companyId,
      title: itemForm.title.trim(),
      problem: itemForm.problem.trim() || null,
      cause: itemForm.cause.trim() || null,
      expected_result: itemForm.expected_result.trim() || null,
      responsible: itemForm.responsible.trim() || null,
      sector: itemForm.sector.trim() || null,
      origin: itemForm.origin.trim() || null,
      status: itemForm.status,
      demand_type: itemForm.demand_type,
      parent_id: itemForm.parent_id,
      item_type: itemForm.item_type,
      progress_pct: itemForm.progress_pct,
      due_date: itemForm.due_date || null,
      observations: itemForm.observations.trim() || null,
      custom_pillar: itemForm.custom_pillar.trim() || null,
      gravity: itemForm.gravity,
      urgency: itemForm.urgency,
      trend: itemForm.trend,
    });
  }

  function handleCreatePilar() {
    if (!companyId) return;
    const pName = newPilarName.trim();
    if (!pName) {
      toast.error("Informe o nome do pilar");
      return;
    }
    const pKey = pName.toLowerCase().replace(/\s+/g, "_");
    
    // Create initial guideline in this pillar
    saveMutation.mutate({
      company_id: companyId,
      title: `Diretriz Inicial: ${pName}`,
      demand_type: pKey,
      custom_pillar: pName.toUpperCase(),
      item_type: "diretriz",
      status: "aberto",
      progress_pct: 0,
    });
  }

  // Filter items
  const filteredPillars = useMemo(() => {
    if (!mapaData) return [];
    return mapaData.pillars;
  }, [mapaData]);

  const treeByPillar = useMemo(() => {
    if (!mapaData) return {};
    const q = searchQuery.toLowerCase().trim();
    if (!q && statusFilter === "all") {
      return mapaData.treeByPillar;
    }

    // Filter tree nodes
    const filtered: Record<string, MapaItem[]> = {};

    for (const [pKey, roots] of Object.entries(mapaData.treeByPillar)) {
      const matchedRoots = roots
        .map((root) => {
          const matchSelf =
            (!q ||
              root.title.toLowerCase().includes(q) ||
              (root.responsible && root.responsible.toLowerCase().includes(q)) ||
              (root.observations && root.observations.toLowerCase().includes(q))) &&
            (statusFilter === "all" || root.status === statusFilter);

          const matchedChildren = (root.children ?? []).filter((child) => {
            const matchChild =
              (!q ||
                child.title.toLowerCase().includes(q) ||
                (child.responsible && child.responsible.toLowerCase().includes(q)) ||
                (child.observations && child.observations.toLowerCase().includes(q))) &&
              (statusFilter === "all" || child.status === statusFilter);
            return matchChild;
          });

          if (matchSelf || matchedChildren.length > 0) {
            return {
              ...root,
              children: matchedChildren,
            };
          }
          return null;
        })
        .filter(Boolean) as MapaItem[];

      filtered[pKey] = matchedRoots;
    }

    return filtered;
  }, [mapaData, searchQuery, statusFilter]);

  const totalAcoes = useMemo(() => {
    if (!mapaData?.items) return 0;
    return mapaData.items.filter((i) => i.item_type !== "diretriz").length;
  }, [mapaData]);

  const totalDiretrizes = useMemo(() => {
    if (!mapaData?.items) return 0;
    return mapaData.items.filter((i) => i.item_type === "diretriz").length;
  }, [mapaData]);

  const currentCompany = companies.find((c: any) => c.id === companyId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Map className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Mapa Estratégico
              </h1>
              <p className="text-xs text-muted-foreground">
                Pilares operacionais, diretrizes em cascata e desdobramentos de ação sincronizados.
              </p>
            </div>
          </div>
        </div>

        {/* Company Picker & Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={companyId ?? ""}
              onValueChange={(val) => {
                setCompanyId(val || null);
                setActiveCompanyId(val || null);
              }}
            >
              <SelectTrigger className="h-9 w-60 text-xs font-semibold bg-background shadow-sm border-border/70">
                <SelectValue placeholder="Selecione a empresa..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {companyId && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-1.5 shadow-sm"
                onClick={() => setPilarModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Pilar
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs gap-1.5 shadow-sm"
                onClick={() => handleOpenNewDiretriz()}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Diretriz
              </Button>
            </>
          )}
        </div>
      </div>

      {/* When no company selected */}
      {!companyId ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-border/80 bg-muted/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-inner">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Selecione uma Empresa para Carregar o Mapa
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            O Mapa Estratégico é individualizado por cliente e conectado diretamente aos planos de ação e painel do cliente da empresa.
          </p>
          <div className="mt-6 w-full max-w-xs">
            <Select
              onValueChange={(val) => {
                setCompanyId(val);
                setActiveCompanyId(val);
              }}
            >
              <SelectTrigger className="h-10 text-sm font-semibold">
                <SelectValue placeholder="Escolha uma empresa..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      ) : loadingMapa ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-40 animate-pulse bg-muted/40 p-5" />
            ))}
          </div>
          <Card className="h-64 animate-pulse bg-muted/40 p-6" />
        </div>
      ) : (
        <>
          {/* 1. CARDS DE RESUMO PARA OS PILARES PRINCIPAIS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" /> Pilares Estratégicos — {currentCompany?.name}
              </h2>
              <span className="text-xs text-muted-foreground">
                {totalAcoes} {totalAcoes === 1 ? "ação de desdobramento" : "ações de desdobramento"}
                {totalDiretrizes > 0 && ` em ${totalDiretrizes} ${totalDiretrizes === 1 ? "diretriz" : "diretrizes"}`}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPillars.map((p) => (
                <Card
                  key={p.key}
                  className={cn(
                    "relative overflow-hidden p-5 transition-all duration-200 hover:shadow-md border",
                    p.border,
                    "bg-gradient-to-br",
                    p.gradient,
                    "bg-card"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider", p.badge)}>
                        {p.name}
                      </span>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                        {p.progress_pct}%
                      </span>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Avanço
                      </p>
                    </div>
                  </div>

                  {/* Barra de Progresso Visual */}
                  <div className="mt-4 space-y-1.5">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-muted/30">
                      <div
                        className={cn("h-full transition-all duration-500 rounded-full", p.progressColor)}
                        style={{ width: `${Math.min(100, Math.max(0, p.progress_pct))}%` }}
                      />
                    </div>
                  </div>

                  {/* Métricas Detalhadas: Concluídas, Em Andamento, A Iniciar, Não será feito */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1.5 border-t pt-3 text-center">
                    <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 p-1 border border-emerald-200/50 dark:border-emerald-800/40">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="tabular-nums">{p.concluidas}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium">Concluídas</span>
                    </div>

                    <div className="rounded-md bg-blue-50/60 dark:bg-blue-950/20 p-1 border border-blue-200/50 dark:border-blue-800/40">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400">
                        <Clock className="h-3 w-3" />
                        <span className="tabular-nums">{p.em_andamento}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium">Em curso</span>
                    </div>

                    <div className="rounded-md bg-slate-50/60 dark:bg-slate-900/30 p-1 border border-slate-200/50 dark:border-slate-700/40">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <Circle className="h-3 w-3" />
                        <span className="tabular-nums">{p.a_iniciar}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium">A iniciar</span>
                    </div>

                    <div className="rounded-md bg-rose-50/60 dark:bg-rose-950/20 p-1 border border-rose-200/50 dark:border-rose-800/40">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400">
                        <AlertCircle className="h-3 w-3" />
                        <span className="tabular-nums">{p.nao_sera_feito}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium">Não fará</span>
                    </div>
                  </div>

                  {/* Quick Action */}
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => handleOpenNewDiretriz(p.key)}
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar diretriz
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 2. CONTROLES DE BUSCA E NAVEGAÇÃO */}
          <Card className="p-3.5 shadow-sm border-border/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por ação, responsável ou observação..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="aberto">A iniciar</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluido">Concluídos</SelectItem>
                    <SelectItem value="nao_sera_feito">Não será feito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={handleExpandAll}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Expandir tudo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={handleCollapseAll}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Recolher tudo
                </Button>

                <div className="w-px h-6 bg-border mx-1" />

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={handleExportPdf}
                  disabled={exportingPdf || !mapaData}
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingPdf ? "Gerando..." : "PDF"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={handleExportExcel}
                  disabled={exportingExcel || !mapaData}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {exportingExcel ? "Gerando..." : "Excel"}
                </Button>
              </div>
            </div>
          </Card>

          {/* 3. HIERARQUIA INTERCONECTADA (ÁRVORE EXPANSÍVEL / ACORDEÃO) */}
          <div className="space-y-4">
            {filteredPillars.map((pilar) => {
              const pilarKey = `pilar_${pilar.key}`;
              const isPilarOpen = expandedNodes[pilarKey] ?? true;
              const roots = treeByPillar[pilar.key] || [];

              return (
                <div
                  key={pilar.key}
                  className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden"
                >
                  {/* Nível 1: Cabeçalho do Pilar */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-3.5 sm:px-4 cursor-pointer select-none transition-colors border-b",
                      "bg-muted/40 hover:bg-muted/60"
                    )}
                    onClick={() => toggleNode(pilarKey)}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="Expandir pilar"
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-transform duration-200"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            !isPilarOpen && "-rotate-90"
                          )}
                        />
                      </button>

                      <div className="flex items-center gap-2.5">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider", pilar.badge)}>
                          {pilar.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          ({pilar.total_diretrizes} {pilar.total_diretrizes === 1 ? "diretriz" : "diretrizes"}, {pilar.total_desdobramentos} {pilar.total_desdobramentos === 1 ? "ação" : "ações"})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:block w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", pilar.progressColor)}
                            style={{ width: `${pilar.progress_pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold tabular-nums text-foreground">
                          {pilar.progress_pct}%
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleOpenNewDiretriz(pilar.key)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Nova Diretriz</span>
                      </Button>
                    </div>
                  </div>

                  {/* Conteúdo do Pilar: Diretrizes e Desdobramentos */}
                  {isPilarOpen && (
                    <div className="divide-y divide-border/60">
                      {roots.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          Nenhuma diretriz cadastrada para este pilar. Clique em "Nova Diretriz" para começar.
                        </div>
                      ) : (
                        roots.map((diretriz, dirIdx) => {
                          const isDirOpen = expandedNodes[diretriz.id] ?? true;
                          const children = diretriz.children || [];
                          const completedChildren = children.filter((c) => c.status === "concluido").length;
                          const dirStatus = statusInfo(diretriz.status);

                          return (
                            <div key={diretriz.id} className="bg-background/50 transition-colors">
                              {/* Nível 2: Diretriz (Ação Mãe) */}
                              <div
                                className={cn(
                                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 hover:bg-muted/30 transition-colors cursor-pointer",
                                  isDirOpen && children.length > 0 && "bg-muted/15"
                                )}
                                onClick={() => toggleNode(diretriz.id)}
                              >
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  {/* Expand toggle */}
                                  <button
                                    type="button"
                                    aria-label="Expandir diretriz"
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground mt-0.5 transition-transform duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleNode(diretriz.id);
                                    }}
                                  >
                                    <ChevronDown
                                      className={cn(
                                        "h-4 w-4 transition-transform duration-200",
                                        !isDirOpen && "-rotate-90"
                                      )}
                                    />
                                  </button>

                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black text-primary tabular-nums shrink-0">
                                        {dirIdx + 1}.
                                      </span>
                                      <h3 className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                                        {diretriz.title}
                                      </h3>
                                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4.5 gap-1 font-medium", dirStatus.badgeClass)}>
                                        <dirStatus.icon className="h-2.5 w-2.5" />
                                        {dirStatus.label}
                                      </Badge>
                                      {children.length > 0 ? (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4.5 font-bold tabular-nums">
                                          {completedChildren}/{children.length} {children.length === 1 ? "ação" : "ações"}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4.5 text-muted-foreground">
                                          0 ações
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Sub-info: Responsável, Prazo, Observação */}
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                      {diretriz.responsible && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/80">
                                          <User className="h-3 w-3 text-muted-foreground" />
                                          {diretriz.responsible}
                                        </span>
                                      )}
                                      {diretriz.due_date && (
                                        <span className="inline-flex items-center gap-1 text-[11px]">
                                          <Calendar className="h-3 w-3 text-muted-foreground" />
                                          {new Date(diretriz.due_date).toLocaleDateString("pt-BR")}
                                        </span>
                                      )}
                                      {diretriz.observations && (
                                        <span className="text-[11px] text-muted-foreground italic truncate max-w-sm">
                                          "{diretriz.observations}"
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Barra de progresso e botões de ação */}
                                <div
                                  className="flex items-center gap-3 shrink-0 self-end sm:self-center pl-8 sm:pl-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Progresso visual da Diretriz */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 sm:w-20 h-2 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all duration-300 rounded-full"
                                        style={{ width: `${diretriz.progress_pct}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-bold tabular-nums text-foreground w-8 text-right">
                                      {diretriz.progress_pct}%
                                    </span>
                                  </div>

                                  {/* Botão para adicionar desdobramento */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[11px] px-2 gap-1"
                                    onClick={() => handleOpenNewSubAction(diretriz)}
                                    title="Adicionar Desdobramento / Ação prática"
                                  >
                                    <CornerDownRight className="h-3 w-3" />
                                    <span className="hidden md:inline">+ Desdobramento</span>
                                  </Button>

                                  {/* Editar */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleOpenEdit(diretriz)}
                                    title="Editar Diretriz"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>

                                  {/* Excluir */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleOpenDelete(diretriz)}
                                    title="Excluir Diretriz"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Nível 3: Ações Estratégicas e Desdobramentos (Filhos) */}
                              {isDirOpen && children.length > 0 && (
                                <div className="bg-muted/10 pl-8 sm:pl-12 pr-3.5 sm:pr-4 py-2 space-y-1.5 border-t border-border/40">
                                  {children.map((sub, subIdx) => {
                                    const subStatus = statusInfo(sub.status);

                                    return (
                                      <div
                                        key={sub.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-lg border border-border/50 bg-background/80 hover:bg-background transition-shadow hover:shadow-xs"
                                      >
                                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 shrink-0">
                                            <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                                            <span className="font-bold tabular-nums text-foreground/70">
                                              {dirIdx + 1}.{subIdx + 1}
                                            </span>
                                          </div>

                                          <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="text-xs font-semibold text-foreground">
                                                {sub.title}
                                              </p>
                                              <Badge
                                                variant="outline"
                                                className={cn("text-[9px] px-1.5 py-0 h-4 gap-1 font-medium", subStatus.badgeClass)}
                                              >
                                                <subStatus.icon className="h-2.5 w-2.5" />
                                                {subStatus.label}
                                              </Badge>
                                            </div>

                                            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground flex-wrap">
                                              {sub.responsible && (
                                                <span className="inline-flex items-center gap-1 text-foreground/80">
                                                  <User className="h-3 w-3 text-muted-foreground" />
                                                  {sub.responsible}
                                                </span>
                                              )}
                                              {sub.sector && (
                                                <span className="inline-flex items-center gap-1 text-foreground/70">
                                                  <FolderTree className="h-3 w-3 text-muted-foreground" />
                                                  {sub.sector}
                                                </span>
                                              )}
                                              {sub.due_date && (
                                                <span className="inline-flex items-center gap-1">
                                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                                  {new Date(sub.due_date).toLocaleDateString("pt-BR")}
                                                </span>
                                              )}
                                              {sub.gut_score ? (
                                                <span className={cn("inline-flex items-center gap-1 px-1.5 py-0 rounded text-[9px] font-bold border", tierOf(sub.gut_score).chip)}>
                                                  {sub.gut_score >= 75 && <Flame className="h-2.5 w-2.5" />}
                                                  GUT {sub.gut_score}
                                                </span>
                                              ) : null}
                                              {sub.observations && (
                                                <span className="italic text-muted-foreground truncate max-w-xs">
                                                  "{sub.observations}"
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Barra de Progresso do Desdobramento + Ações */}
                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-6 sm:pl-0">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                              <div
                                                className={cn("h-full rounded-full transition-all duration-300", subStatus.dotClass)}
                                                style={{ width: `${sub.progress_pct}%` }}
                                              />
                                            </div>
                                            <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-7 text-right">
                                              {sub.progress_pct}%
                                            </span>
                                          </div>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                            onClick={() => handleOpenEdit(sub)}
                                            title="Editar desdobramento"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleOpenDelete(sub)}
                                            title="Excluir desdobramento"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>

                                          {(sub.description || sub.problem || sub.cause || sub.expected_result || sub.observations) && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className={cn(
                                                "h-6 w-6 text-muted-foreground hover:text-primary",
                                                expandedActionDetails[sub.id] && "text-primary"
                                              )}
                                              onClick={() => toggleActionDetail(sub.id)}
                                              title={expandedActionDetails[sub.id] ? "Ocultar detalhes" : "Ver detalhes"}
                                            >
                                              {expandedActionDetails[sub.id] ? (
                                                <EyeOff className="h-3 w-3" />
                                              ) : (
                                                <Eye className="h-3 w-3" />
                                              )}
                                            </Button>
                                          )}
                                        </div>

                                        {/* Painel de detalhes expandível */}
                                        {expandedActionDetails[sub.id] && (
                                          <div className="mt-2 p-3 rounded-lg border border-border/40 bg-muted/20 space-y-2 text-xs">
                                            {sub.problem && (
                                              <div>
                                                <span className="font-semibold text-foreground">Problema: </span>
                                                <span className="text-muted-foreground">{sub.problem}</span>
                                              </div>
                                            )}
                                            {sub.cause && (
                                              <div>
                                                <span className="font-semibold text-foreground">Causa: </span>
                                                <span className="text-muted-foreground">{sub.cause}</span>
                                              </div>
                                            )}
                                            {(sub.description || sub.observations) && (
                                              <div>
                                                <span className="font-semibold text-foreground">Descrição: </span>
                                                <span className="text-muted-foreground">{sub.description || sub.observations}</span>
                                              </div>
                                            )}
                                            {sub.expected_result && (
                                              <div>
                                                <span className="font-semibold text-foreground">Resultado Esperado: </span>
                                                <span className="text-muted-foreground">{sub.expected_result}</span>
                                              </div>
                                            )}
                                            {sub.origin && (
                                              <div>
                                                <span className="font-semibold text-foreground">Origem: </span>
                                                <span className="text-muted-foreground">{sub.origin}</span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de Diretriz (simplificado) */}
      <Dialog
        open={itemModalOpen && (itemModalMode === "diretriz" || (itemModalMode === "edit" && itemForm.item_type === "diretriz"))}
        onOpenChange={setItemModalOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {itemModalMode === "diretriz" ? (
                <Plus className="h-4 w-4 text-primary" />
              ) : (
                <Pencil className="h-4 w-4 text-primary" />
              )}
              {itemModalMode === "diretriz" ? "Nova Diretriz Estratégica" : "Editar Diretriz"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {/* Título */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Título da Diretriz (Ação Mãe) *</Label>
              <Input
                placeholder="Ex: Fortalecer a governança institucional e comitês de gestão"
                value={itemForm.title}
                onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Pilar Estratégico */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pilar Estratégico</Label>
              <Select
                value={itemForm.demand_type}
                onValueChange={(val) => {
                  const standardKeys = ["pessoas", "processo", "negocio"];
                  const isCustom = val && !standardKeys.includes(val.toLowerCase());
                  setItemForm({
                    ...itemForm,
                    demand_type: val,
                    custom_pillar: isCustom ? val.toUpperCase() : "",
                  });
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione o pilar" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPillars.map((p) => (
                    <SelectItem key={p.key} value={p.key} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição Breve */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição Breve</Label>
              <Textarea
                rows={3}
                placeholder="Descreva brevemente o objetivo desta diretriz..."
                value={itemForm.observations}
                onChange={(e) => setItemForm({ ...itemForm, observations: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            <p className="text-[10px] text-muted-foreground italic">
              A diretriz é classificada automaticamente como Nível 2 (Mãe). Os desdobramentos (ações executáveis) serão adicionados dentro dela.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveItem}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar Diretriz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Desdobramento (completo = igual Plano de Ação) */}
      <Dialog
        open={itemModalOpen && (itemModalMode === "desdobramento" || (itemModalMode === "edit" && itemForm.item_type !== "diretriz"))}
        onOpenChange={setItemModalOpen}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {itemModalMode === "desdobramento" ? (
                <CornerDownRight className="h-4 w-4 text-primary" />
              ) : (
                <Pencil className="h-4 w-4 text-primary" />
              )}
              {itemModalMode === "desdobramento"
                ? `Novo Desdobramento${parentItemForSub ? ` · ${parentItemForSub.title}` : ""}`
                : "Editar Desdobramento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {/* Título da Ação */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ação / Desdobramento *</Label>
              <Input
                placeholder="Ex: Implementar reunião semanal de alinhamento com ata"
                value={itemForm.title}
                onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Origem & Setor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Origem</Label>
                <Input
                  placeholder="Ex: Entrevista, cronoanálise..."
                  value={itemForm.origin}
                  onChange={(e) => setItemForm({ ...itemForm, origin: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Setor Responsável</Label>
                <Input
                  placeholder="Ex: Comercial, Operações, RH..."
                  value={itemForm.sector}
                  onChange={(e) => setItemForm({ ...itemForm, sector: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Pilar / Tipo de Demanda */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pilar Estratégico</Label>
              <Select
                value={itemForm.demand_type}
                onValueChange={(val) => {
                  const standardKeys = ["pessoas", "processo", "negocio"];
                  const isCustom = val && !standardKeys.includes(val.toLowerCase());
                  setItemForm({
                    ...itemForm,
                    demand_type: val,
                    custom_pillar: isCustom ? val.toUpperCase() : "",
                  });
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione o pilar" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPillars.map((p) => (
                    <SelectItem key={p.key} value={p.key} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Problema & Causa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Problema Detectado</Label>
                <Textarea
                  rows={2}
                  placeholder="Qual gargalo ou desafio motivou esta ação?"
                  value={itemForm.problem}
                  onChange={(e) => setItemForm({ ...itemForm, problem: e.target.value })}
                  className="text-xs resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Causa Raiz</Label>
                <Textarea
                  rows={2}
                  placeholder="Por que o problema ocorre?"
                  value={itemForm.cause}
                  onChange={(e) => setItemForm({ ...itemForm, cause: e.target.value })}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição / Ação</Label>
              <Textarea
                rows={2}
                placeholder="O que será feito de forma detalhada?"
                value={itemForm.observations}
                onChange={(e) => setItemForm({ ...itemForm, observations: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            {/* Resultado Esperado */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Resultado Esperado</Label>
              <Textarea
                rows={2}
                placeholder="Qual o impacto quantitativo ou qualitativo esperado?"
                value={itemForm.expected_result}
                onChange={(e) => setItemForm({ ...itemForm, expected_result: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            {/* Responsável & Prazo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Responsável pela Execução</Label>
                <Input
                  placeholder="Nome do responsável"
                  value={itemForm.responsible}
                  onChange={(e) => setItemForm({ ...itemForm, responsible: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Prazo de Conclusão</Label>
                <Input
                  type="date"
                  value={itemForm.due_date}
                  onChange={(e) => setItemForm({ ...itemForm, due_date: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Matriz GUT */}
            <div className="rounded-xl border p-3 bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Matriz GUT (Priorização 1–5)
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Gravidade × Urgência × Tendência (Score 1 a 125)
                  </p>
                </div>
                {(() => {
                  const score = (itemForm.gravity || 3) * (itemForm.urgency || 3) * (itemForm.trend || 3);
                  const tier = tierOf(score);
                  return (
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-black tabular-nums inline-flex items-center gap-1", tier.chip)}>
                      {score >= 75 && <Flame className="h-3 w-3" />}
                      {score} · {tier.label}
                    </span>
                  );
                })()}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <GutStepper label="Gravidade" value={itemForm.gravity} onChange={(v) => setItemForm({ ...itemForm, gravity: v })} />
                <GutStepper label="Urgência" value={itemForm.urgency} onChange={(v) => setItemForm({ ...itemForm, urgency: v })} />
                <GutStepper label="Tendência" value={itemForm.trend} onChange={(v) => setItemForm({ ...itemForm, trend: v })} />
              </div>
            </div>

            {/* Status & Progresso */}
            <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label className="text-xs font-semibold">Status de Execução</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["aberto", "em_andamento", "concluido", "nao_sera_feito"] as const).map((st) => {
                    const stMeta = statusInfo(st);
                    const isActive = itemForm.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          let nextPct = itemForm.progress_pct;
                          if (st === "concluido") nextPct = 100;
                          else if (st === "aberto" || st === "nao_sera_feito") nextPct = 0;
                          else if (st === "em_andamento" && (nextPct === 0 || nextPct === 100)) nextPct = 50;
                          setItemForm({ ...itemForm, status: st, progress_pct: nextPct });
                        }}
                        className={cn(
                          "px-2 py-1 rounded text-xs font-semibold border transition-all",
                          isActive
                            ? stMeta.badgeClass + " shadow-xs font-bold"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {stMeta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Percentual de Avanço</span>
                  <span className="font-bold tabular-nums text-foreground">{itemForm.progress_pct}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[itemForm.progress_pct]}
                  onValueChange={([val]) => {
                    let st = itemForm.status;
                    if (val === 100) st = "concluido";
                    else if (val === 0) st = itemForm.status === "nao_sera_feito" ? "nao_sera_feito" : "aberto";
                    else st = "em_andamento";
                    setItemForm({ ...itemForm, progress_pct: val, status: st });
                  }}
                  disabled={itemForm.status === "nao_sera_feito"}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveItem}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar Desdobramento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Pilar Customizado */}
      <Dialog open={pilarModalOpen} onOpenChange={setPilarModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Novo Pilar Estratégico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Adicione um novo pilar personalizado para agrupar diretrizes (ex: TECNOLOGIA, SUSTENTABILIDADE, INOVAÇÃO).
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Pilar *</Label>
              <Input
                placeholder="Ex: TECNOLOGIA E DADOS"
                value={newPilarName}
                onChange={(e) => setNewPilarName(e.target.value)}
                className="text-sm uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPilarModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreatePilar}
              disabled={saveMutation.isPending || !newPilarName.trim()}
            >
              Criar Pilar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p>
              Deseja realmente excluir{" "}
              <strong className="text-foreground">"{itemToDelete?.title}"</strong>?
            </p>
            {itemToDelete?.item_type === "diretriz" && (
              <p className="text-destructive font-medium">
                Atenção: todos os desdobramentos vinculados a esta diretriz também serão excluídos.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
