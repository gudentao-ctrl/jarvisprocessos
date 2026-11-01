import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, Copy, LayoutTemplate, RefreshCw, Save, Trash2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DRE_CATEGORIES,
  applyTemplate,
  computeDre,
  standardDreBlocks,
  stripAmounts,
  type DreBlock,
} from "@/lib/dre-model";
import {
  deleteDreRecord,
  fetchDreRecords,
  fetchDreTemplate,
  saveDreRecord,
  saveDreTemplate,
  type DreMode,
} from "@/lib/torre-storage";
import { DreModelBuilder } from "./DreModelBuilder";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthOptions() {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = -18; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return opts.reverse();
}

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]?.slice(0, 3) ?? m}/${y}`;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Assinatura da estrutura (sem valores) para saber se o mês segue o modelo atual. */
function structureKey(blocks: DreBlock[]): string {
  return JSON.stringify(
    blocks.map((b) =>
      b.kind === "group"
        ? [b.id, b.label, b.category, b.lines.map((l) => [l.id, l.label])]
        : [b.id, b.label],
    ),
  );
}

export function DreTab({ companyId, companyName }: { companyId: string; companyName?: string }) {
  const qc = useQueryClient();
  const { hasAccess } = usePermissions();
  const canWrite = hasAccess("torre_controle", "update") || hasAccess("torre_controle", "create");
  const canDelete = hasAccess("torre_controle", "delete");

  const months = useMemo(monthOptions, []);
  const [month, setMonth] = useState(currentMonth());
  const [mode, setMode] = useState<DreMode>("realizado");
  const [view, setView] = useState<"valores" | "modelo">("valores");
  const [edit, setEdit] = useState<{ key: string; blocks: DreBlock[] } | null>(null);

  const templateQ = useQuery({
    queryKey: ["torre-dre-template", companyId],
    queryFn: () => fetchDreTemplate(companyId),
  });
  const recordsQ = useQuery({
    queryKey: ["torre-dre-records", companyId],
    queryFn: () => fetchDreRecords(companyId),
  });

  const model = useMemo(() => templateQ.data ?? standardDreBlocks(), [templateQ.data]);
  const records = recordsQ.data ?? [];
  const saved = records.find((r) => r.month_year === month && r.mode === mode);
  const key = `${month}|${mode}`;
  const baseBlocks = useMemo(() => (saved ? saved.blocks : stripAmounts(model)), [saved, model]);
  const dirty = !!edit && edit.key === key;
  const blocks = dirty ? edit!.blocks : baseBlocks;
  const computed = useMemo(() => computeDre(blocks), [blocks]);
  const followsModel = structureKey(blocks) === structureKey(model);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["torre-dre-records", companyId] });
    void qc.invalidateQueries({ queryKey: ["torre-dre-template", companyId] });
    void qc.invalidateQueries({ queryKey: ["roadmap-cockpit", companyId] });
  };

  const saveMut = useMutation({
    mutationFn: () => saveDreRecord({ companyId, monthYear: month, mode, blocks }),
    onSuccess: () => {
      setEdit(null);
      invalidate();
      toast.success("DRE salvo. Já aparece no computador e no celular.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const templateMut = useMutation({
    mutationFn: (next: DreBlock[]) => saveDreTemplate(companyId, next),
    onSuccess: (_d, next) => {
      invalidate();
      setView("valores");
      if (saved || dirty) setEdit({ key, blocks: applyTemplate(next, blocks) });
      toast.success(
        saved
          ? "Modelo salvo. O mês aberto foi reorganizado — confira e clique em Salvar DRE."
          : "Modelo do cliente salvo.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteDreRecord(saved!.id),
    onSuccess: () => {
      setEdit(null);
      invalidate();
      toast.success("Lançamentos do mês excluídos.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePeriod = (nextMonth: string, nextMode: DreMode) => {
    if (dirty && !window.confirm("Há valores não salvos neste mês. Descartar?")) return;
    setEdit(null);
    setMonth(nextMonth);
    setMode(nextMode);
  };

  const setAmount = (groupId: string, lineId: string, raw: string) => {
    const amount = raw === "" ? 0 : Number(raw.replace(",", "."));
    if (!Number.isFinite(amount)) return;
    setEdit({
      key,
      blocks: blocks.map((b) =>
        b.kind === "group" && b.id === groupId
          ? { ...b, lines: b.lines.map((l) => (l.id === lineId ? { ...l, amount } : l)) }
          : b,
      ),
    });
  };

  const clonePrevious = () => {
    const prev = records
      .filter((r) => r.mode === mode && r.month_year < month)
      .sort((a, b) => b.month_year.localeCompare(a.month_year))[0];
    if (!prev) {
      toast.error("Nenhum mês anterior salvo para copiar.");
      return;
    }
    setEdit({ key, blocks: applyTemplate(model, prev.blocks) });
    toast.success(`Valores de ${monthLabel(prev.month_year)} copiados. Ajuste e salve.`);
  };

  if (templateQ.isError || recordsQ.isError) {
    return (
      <Card className="p-6 text-center text-sm text-destructive">
        Não foi possível carregar o DRE. Verifique a conexão e tente novamente.
      </Card>
    );
  }

  if (view === "modelo") {
    return (
      <DreModelBuilder
        initial={model}
        companyName={companyName}
        saving={templateMut.isPending}
        onCancel={() => setView("valores")}
        onSave={(next) => templateMut.mutate(next)}
      />
    );
  }

  const t = computed.totals;
  const lastBlock = blocks[blocks.length - 1];
  const loading = templateQ.isPending || recordsQ.isPending;

  return (
    <div className="space-y-4">
      {/* Período e ações */}
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Mês</Label>
            <Select value={month} onValueChange={(v) => changePeriod(v, mode)}>
              <SelectTrigger className="mt-1 h-10 w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                    {records.some((r) => r.month_year === m.value) ? " •" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex h-10 rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Tipo de DRE">
            {(["realizado", "orcado"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => changePeriod(month, m)}
                className={`rounded-md px-3 text-xs font-semibold transition-colors ${
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {m === "realizado" ? "Realizado" : "Orçado"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setView("modelo")}>
              <LayoutTemplate className="h-4 w-4" /> Personalizar DRE do cliente
            </Button>
          )}
          {canWrite && (
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={clonePrevious}>
              <Copy className="h-4 w-4" /> Copiar mês anterior
            </Button>
          )}
          {saved && canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-muted-foreground hover:text-destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (window.confirm(`Excluir os valores de ${monthLabel(month)} (${mode})?`)) deleteMut.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" /> Excluir mês
            </Button>
          )}
          <Badge variant={saved ? "secondary" : "outline"} className="ml-auto text-[10px]">
            {dirty ? "Alterações não salvas" : saved ? "Salvo" : "Ainda não lançado"}
          </Badge>
        </div>
        {!templateQ.data && !loading && (
          <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            Este cliente usa a estrutura gerencial padrão. Toque em “Personalizar DRE do cliente” para montar a
            estrutura dele.
          </p>
        )}
        {!followsModel && !loading && (
          <div className="flex flex-col gap-2 rounded-md border border-acc-amber/40 bg-acc-amber/10 p-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span>Este mês foi lançado com uma estrutura diferente do modelo atual do cliente.</span>
            {canWrite && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 bg-background"
                onClick={() => setEdit({ key, blocks: applyTemplate(model, blocks) })}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Aplicar modelo
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: "Receita bruta", value: brl(t.receitaBruta), tone: "text-foreground" },
          { label: "Receita líquida", value: brl(t.receitaLiquida), tone: "text-acc-blue" },
          { label: "Margem de contribuição", value: `${t.margemContribuicaoPct.toFixed(1)}%`, tone: "text-acc-violet" },
          {
            label: "Resultado final",
            value: brl(t.resultado),
            tone: t.resultado >= 0 ? "text-acc-emerald" : "text-destructive",
          },
        ].map((c) => (
          <Card key={c.label} className="min-w-0 p-3">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className={`mt-1 truncate text-base font-bold tabular-nums sm:text-lg ${c.tone}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Tabela do DRE */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-3 sm:px-4">
          <Calculator className="h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 truncate text-sm font-semibold">
            DRE {mode === "realizado" ? "Realizado" : "Orçado"} · {monthLabel(month)}
          </p>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="divide-y">
            {blocks.map((b) => {
              if (b.kind === "subtotal") {
                const v = computed.blockValues[b.id] ?? 0;
                const final = b.id === lastBlock?.id;
                return (
                  <div
                    key={b.id}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-4 ${
                      final ? (v >= 0 ? "bg-acc-emerald/10" : "bg-destructive/10") : "bg-primary/5"
                    }`}
                  >
                    <p className={`min-w-0 font-bold ${final ? "text-base" : "text-sm"}`}>{b.label}</p>
                    <div className="text-right">
                      <p
                        className={`font-bold tabular-nums ${final ? "text-base" : "text-sm"} ${
                          v < 0 ? "text-destructive" : final ? "text-acc-emerald" : ""
                        }`}
                      >
                        {brl(v)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {(computed.blockPct[b.id] ?? 0).toFixed(1)}% da receita líquida
                      </p>
                    </div>
                  </div>
                );
              }
              const sign = DRE_CATEGORIES[b.category].sign;
              return (
                <div key={b.id} className="px-3 py-3 sm:px-4">
                  <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{b.label}</p>
                      <p className="text-[10px] text-muted-foreground">{DRE_CATEGORIES[b.category].short}</p>
                    </div>
                    <p className={`text-sm font-bold tabular-nums ${sign > 0 ? "text-acc-emerald" : "text-destructive"}`}>
                      {sign > 0 ? "" : "– "}
                      {brl(computed.blockValues[b.id] ?? 0)}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {b.lines.map((l) => (
                      <div
                        key={l.id}
                        className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]"
                      >
                        <label htmlFor={`dre-${l.id}`} className="min-w-0 text-xs leading-snug sm:text-sm">
                          {l.label}
                        </label>
                        <Input
                          id={`dre-${l.id}`}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="0,00"
                          disabled={!canWrite}
                          value={l.amount === 0 ? "" : l.amount}
                          onChange={(e) => setAmount(b.id, l.id, e.target.value)}
                          className="h-9 text-right text-sm tabular-nums"
                        />
                      </div>
                    ))}
                    {b.lines.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sem linhas — adicione no modelo do cliente.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {canWrite && (
        <div className="sticky bottom-0 z-10 -mx-1 border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || loading}
            size="lg"
            className="h-11 w-full gap-2 sm:ml-auto sm:flex sm:w-auto"
          >
            <Save className="h-4 w-4" />
            {saveMut.isPending ? "Salvando…" : "Salvar DRE"}
          </Button>
        </div>
      )}
    </div>
  );
}
