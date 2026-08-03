import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { isUnknown, type PopContent, type PopStep } from "@/lib/pop-types";
import { cn } from "@/lib/utils";

function UnknownHint({ value }: { value: string }) {
  if (!isUnknown(value)) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600">
      <AlertTriangle className="h-3 w-3" /> Requer validação
    </p>
  );
}

function ListEditor({
  label, items, placeholder, onChange,
}: { label: string; items: string[]; placeholder: string; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button variant="ghost" size="sm" onClick={() => onChange([...items, ""])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item.</p>}
      {items.map((it, i) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-2">
            <Input
              value={it}
              placeholder={placeholder}
              className={cn(isUnknown(it) && "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20")}
              onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))}
            />
            <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <UnknownHint value={it} />
        </div>
      ))}
    </div>
  );
}

export function PopEditor({ value, onChange }: { value: PopContent; onChange: (v: PopContent) => void }) {
  const set = <K extends keyof PopContent>(k: K, v: PopContent[K]) => onChange({ ...value, [k]: v });

  const setStep = (i: number, patch: Partial<PopStep>) =>
    set("steps", value.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const moveStep = (i: number, dir: -1 | 1) => {
    const next = [...value.steps];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("steps", next);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div>
          <Label>Nome do processo</Label>
          <Input value={value.process_name} onChange={(e) => set("process_name", e.target.value)} />
          <UnknownHint value={value.process_name} />
        </div>
        <div>
          <Label>Objetivo</Label>
          <Textarea rows={3} value={value.objective} onChange={(e) => set("objective", e.target.value)} />
          <UnknownHint value={value.objective} />
        </div>
        <div>
          <Label>Escopo</Label>
          <Textarea rows={3} value={value.scope} onChange={(e) => set("scope", e.target.value)} />
          <UnknownHint value={value.scope} />
        </div>
      </Card>

      <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <ListEditor label="Responsáveis" items={value.responsibles} placeholder="Área ou cargo" onChange={(v) => set("responsibles", v)} />
        <ListEditor label="Entradas" items={value.inputs} placeholder="Documento, dado ou insumo" onChange={(v) => set("inputs", v)} />
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Procedimento Operacional</h3>
            <p className="text-xs text-muted-foreground">Passo a passo numerado — arraste com as setas para reordenar.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => set("steps", [...value.steps, { title: "", description: "", responsible: "" }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Etapa
          </Button>
        </div>
        {value.steps.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma etapa.</p>}
        <div className="space-y-2">
          {value.steps.map((s, i) => (
            <div key={i} className="rounded-lg border bg-card/60 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={s.title}
                    placeholder="Título da etapa"
                    className={cn("font-medium", isUnknown(s.title) && "border-amber-400")}
                    onChange={(e) => setStep(i, { title: e.target.value })}
                  />
                  <Textarea rows={2} value={s.description} placeholder="Como executar" onChange={(e) => setStep(i, { description: e.target.value })} />
                  <Input value={s.responsible} placeholder="Responsável" onChange={(e) => setStep(i, { responsible: e.target.value })} />
                  <UnknownHint value={s.responsible} />
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" onClick={() => moveStep(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => moveStep(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => set("steps", value.steps.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <ListEditor label="Saídas" items={value.outputs} placeholder="Resultado ou entregável" onChange={(v) => set("outputs", v)} />
        <ListEditor label="Pontos de atenção" items={value.attention_points} placeholder="Risco, exceção ou cuidado" onChange={(v) => set("attention_points", v)} />
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Indicadores sugeridos</h3>
            <p className="text-xs text-muted-foreground">Ex.: tempo médio, SLA, retrabalho, demandas em atraso, volume executado.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => set("indicators", [...value.indicators, { name: "", description: "" }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Indicador
          </Button>
        </div>
        {value.indicators.length === 0 && <p className="text-xs text-muted-foreground">Nenhum indicador.</p>}
        {value.indicators.map((ind, i) => (
          <div key={i} className="flex gap-2">
            <Input
              className="sm:max-w-[240px]"
              value={ind.name}
              placeholder="Nome"
              onChange={(e) => set("indicators", value.indicators.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
            />
            <Input
              value={ind.description}
              placeholder="Como medir / por que importa"
              onChange={(e) => set("indicators", value.indicators.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))}
            />
            <Button variant="ghost" size="icon" onClick={() => set("indicators", value.indicators.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
