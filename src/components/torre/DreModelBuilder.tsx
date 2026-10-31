import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Equal, LayoutTemplate, Plus, Save, Trash2, X } from "lucide-react";
import {
  DRE_CATEGORIES,
  DRE_CATEGORY_ORDER,
  DRE_PRESETS,
  type DreBlock,
  type DreCategory,
  type DreGroupBlock,
  newId,
  stripAmounts,
} from "@/lib/dre-model";

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}

/** Editor da estrutura do DRE do cliente: grupos, natureza contábil, linhas e subtotais. */
export function DreModelBuilder({
  initial,
  companyName,
  saving,
  onSave,
  onCancel,
}: {
  initial: DreBlock[];
  companyName?: string;
  saving: boolean;
  onSave: (blocks: DreBlock[]) => void;
  onCancel: () => void;
}) {
  const [blocks, setBlocks] = useState<DreBlock[]>(() => stripAmounts(initial));

  const updateBlock = (id: string, patch: Partial<DreGroupBlock>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as DreBlock) : b)));

  const addGroup = (category: DreCategory = "custo_fixo") =>
    setBlocks((prev) => [
      ...prev,
      {
        id: newId(),
        kind: "group",
        label: `${DRE_CATEGORIES[category].sign > 0 ? "(+)" : "(–)"} Novo grupo`,
        category,
        lines: [{ id: newId(), label: "Nova linha", amount: 0 }],
      },
    ]);

  const addSubtotal = () =>
    setBlocks((prev) => [...prev, { id: newId(), kind: "subtotal", label: "= Novo subtotal" }]);

  const applyPreset = (key: string) => {
    const preset = DRE_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    if (blocks.length > 0 && !window.confirm(`Substituir a estrutura atual pelo modelo "${preset.label}"?`)) return;
    setBlocks(preset.blocks());
  };

  const groups = blocks.filter((b) => b.kind === "group").length;
  const emptyLabels = blocks.some(
    (b) => !b.label.trim() || (b.kind === "group" && b.lines.some((l) => !l.label.trim())),
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">Modelo do DRE {companyName ? `· ${companyName}` : ""}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Monte a estrutura do jeito que o cliente enxerga o negócio: renomeie, crie grupos e linhas, defina se
              cada grupo soma ou subtrai e coloque subtotais (ex.: EBITDA) onde quiser. O subtotal mostra o resultado
              acumulado de tudo que está acima dele.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <Select onValueChange={applyPreset}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Começar a partir de um modelo pronto…" />
            </SelectTrigger>
            <SelectContent>
              {DRE_PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  <span className="font-medium">{p.label}</span>
                  <span className="ml-1 text-xs text-muted-foreground">— {p.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground sm:text-right">
            {groups} {groups === 1 ? "grupo" : "grupos"} · {blocks.length - groups} subtotais
          </p>
        </div>
      </Card>

      <div className="space-y-3">
        {blocks.map((block, index) => {
          const moveControls = (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Mover para cima"
                disabled={index === 0}
                onClick={() => setBlocks((prev) => move(prev, index, -1))}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Mover para baixo"
                disabled={index === blocks.length - 1}
                onClick={() => setBlocks((prev) => move(prev, index, 1))}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Excluir"
                onClick={() => setBlocks((prev) => prev.filter((b) => b.id !== block.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );

          if (block.kind === "subtotal") {
            return (
              <div
                key={block.id}
                className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5"
              >
                <Equal className="h-4 w-4 shrink-0 text-primary" />
                <Input
                  value={block.label}
                  aria-label="Nome do subtotal"
                  onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                  className="h-9 min-w-0 flex-1 font-bold"
                />
                {moveControls}
              </div>
            );
          }

          const cat = DRE_CATEGORIES[block.category];
          return (
            <Card key={block.id} className="overflow-hidden">
              <div className="space-y-2 border-b bg-muted/40 p-2.5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${cat.sign > 0 ? "border-acc-emerald text-acc-emerald" : "border-destructive text-destructive"}`}
                  >
                    {cat.sign > 0 ? "+ soma" : "− subtrai"}
                  </Badge>
                  <Input
                    value={block.label}
                    aria-label="Nome do grupo"
                    onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                    className="h-9 min-w-0 flex-1 text-sm font-semibold"
                  />
                  {moveControls}
                </div>
                <Select
                  value={block.category}
                  onValueChange={(v) => updateBlock(block.id, { category: v as DreCategory })}
                >
                  <SelectTrigger className="h-9 text-xs" aria-label="Natureza do grupo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRE_CATEGORY_ORDER.map((c) => (
                      <SelectItem key={c} value={c}>
                        {DRE_CATEGORIES[c].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 p-2.5">
                {block.lines.map((line, li) => (
                  <div key={line.id} className="flex items-center gap-1">
                    <Input
                      value={line.label}
                      aria-label="Nome da linha"
                      onChange={(e) =>
                        updateBlock(block.id, {
                          lines: block.lines.map((l) => (l.id === line.id ? { ...l, label: e.target.value } : l)),
                        })
                      }
                      className="h-9 min-w-0 flex-1 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label="Subir linha"
                      disabled={li === 0}
                      onClick={() => updateBlock(block.id, { lines: move(block.lines, li, -1) })}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Excluir linha"
                      onClick={() =>
                        updateBlock(block.id, { lines: block.lines.filter((l) => l.id !== line.id) })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() =>
                    updateBlock(block.id, {
                      lines: [...block.lines, { id: newId(), label: "Nova linha", amount: 0 }],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Linha
                </Button>
              </div>
            </Card>
          );
        })}
        {blocks.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum grupo ainda. Escolha um modelo pronto acima ou adicione grupos abaixo.
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-10 gap-1.5" onClick={() => addGroup()}>
          <Plus className="h-4 w-4" /> Grupo
        </Button>
        <Button type="button" variant="outline" className="h-10 gap-1.5" onClick={addSubtotal}>
          <Equal className="h-4 w-4" /> Subtotal
        </Button>
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="h-11 flex-1 gap-2 sm:ml-auto sm:flex-none"
          disabled={saving || groups === 0 || emptyLabels}
          onClick={() => onSave(blocks)}
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando…" : "Salvar modelo do cliente"}
        </Button>
      </div>
      {emptyLabels && <p className="text-xs text-destructive">Dê um nome a todos os grupos, linhas e subtotais.</p>}
    </div>
  );
}
