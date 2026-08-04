import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import {
  isUnknown,
  type PopContent,
  type PopDefinition,
  type PopIndicator,
  type PopResponsibility,
  type PopRisk,
  type PopStep,
} from "@/lib/pop-types";
import { cn } from "@/lib/utils";

function UnknownHint({ value }: { value: string }) {
  if (!isUnknown(value)) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600">
      <AlertTriangle className="h-3 w-3" /> Requer validação
    </p>
  );
}

function Section({ n, title, hint, action, children }: {
  n: number; title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
            {n}
          </span>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function ListEditor({
  label, items, placeholder, onChange,
}: { label?: string; items: string[]; placeholder: string; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label ? <Label>{label}</Label> : <span />}
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
  const setId = (k: keyof PopContent["identification"], v: string) =>
    onChange({ ...value, identification: { ...value.identification, [k]: v } });

  const setItem = <T,>(key: keyof PopContent, list: T[], i: number, patch: Partial<T>) =>
    set(key, list.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) as any);
  const removeItem = (key: keyof PopContent, list: any[], i: number) =>
    set(key, list.filter((_, idx) => idx !== i) as any);

  const moveStep = (i: number, dir: -1 | 1) => {
    const next = [...value.steps];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("steps", next);
  };

  const idFields: Array<[keyof PopContent["identification"], string]> = [
    ["process_name", "Nome do processo"],
    ["code", "Código do POP"],
    ["version", "Versão"],
    ["issue_date", "Data de emissão"],
    ["last_revision", "Última revisão"],
    ["process_owner", "Responsável pelo processo"],
    ["area", "Área responsável"],
    ["prepared_by", "Elaborado por"],
    ["approved_by", "Aprovado por"],
  ];

  return (
    <div className="space-y-4">
      <Section n={1} title="Identificação">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {idFields.map(([k, label]) => (
            <div key={k}>
              <Label className="text-xs">{label}</Label>
              <Input
                value={value.identification[k]}
                className={cn(isUnknown(value.identification[k]) && "border-amber-400")}
                onChange={(e) => setId(k, e.target.value)}
              />
              <UnknownHint value={value.identification[k]} />
            </div>
          ))}
        </div>
      </Section>

      <Section n={2} title="Objetivo" hint="Finalidade detalhada do processo.">
        <Textarea rows={5} value={value.objective} onChange={(e) => set("objective", e.target.value)} />
        <UnknownHint value={value.objective} />
      </Section>

      <Section n={3} title="Aplicação / Escopo" hint="Onde começa, onde termina, setores envolvidos e situações de uso.">
        <Textarea rows={5} value={value.scope} onChange={(e) => set("scope", e.target.value)} />
        <UnknownHint value={value.scope} />
      </Section>

      <Section
        n={4}
        title="Definições"
        hint="Termos técnicos utilizados no processo."
        action={
          <Button variant="outline" size="sm" onClick={() => set("definitions", [...value.definitions, { term: "", definition: "" } as PopDefinition])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Termo
          </Button>
        }
      >
        {value.definitions.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma definição.</p>}
        {value.definitions.map((d, i) => (
          <div key={i} className="flex gap-2">
            <Input className="sm:max-w-[220px]" placeholder="Termo" value={d.term}
              onChange={(e) => setItem("definitions", value.definitions, i, { term: e.target.value })} />
            <Input placeholder="Definição" value={d.definition}
              onChange={(e) => setItem("definitions", value.definitions, i, { definition: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => removeItem("definitions", value.definitions, i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Section>

      <Section
        n={5}
        title="Responsabilidades"
        hint="Responsável, função e responsabilidade no processo."
        action={
          <Button variant="outline" size="sm" onClick={() => set("responsibilities", [...value.responsibilities, { role: "", job_function: "", responsibility: "" } as PopResponsibility])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Responsável
          </Button>
        }
      >
        {value.responsibilities.length === 0 && <p className="text-xs text-muted-foreground">Nenhum responsável.</p>}
        {value.responsibilities.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
            <Input placeholder="Responsável" value={r.role}
              onChange={(e) => setItem("responsibilities", value.responsibilities, i, { role: e.target.value })} />
            <Input placeholder="Função" value={r.job_function}
              onChange={(e) => setItem("responsibilities", value.responsibilities, i, { job_function: e.target.value })} />
            <Input placeholder="Responsabilidade" value={r.responsibility}
              onChange={(e) => setItem("responsibilities", value.responsibilities, i, { responsibility: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => removeItem("responsibilities", value.responsibilities, i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Section>

      <Section n={6} title="Entradas" hint="Documentos, sistemas, informações, requisitos e aprovações necessários.">
        <ListEditor items={value.inputs} placeholder="Documento, sistema, informação ou aprovação" onChange={(v) => set("inputs", v)} />
      </Section>

      <Section
        n={7}
        title="Procedimento Operacional"
        hint="Passo a passo detalhado: como executar cada atividade."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set("steps", [...value.steps, { title: "", description: "", responsible: "", documents: "", system: "", decision_criteria: "", expected_result: "" } as PopStep])
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Etapa
          </Button>
        }
      >
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
                    placeholder="Nome da atividade"
                    className={cn("font-medium", isUnknown(s.title) && "border-amber-400")}
                    onChange={(e) => setItem("steps", value.steps, i, { title: e.target.value })}
                  />
                  <Textarea rows={3} value={s.description} placeholder="Descrição completa: como executar"
                    onChange={(e) => setItem("steps", value.steps, i, { description: e.target.value })} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={s.responsible} placeholder="Responsável"
                      onChange={(e) => setItem("steps", value.steps, i, { responsible: e.target.value })} />
                    <Input value={s.system} placeholder="Sistema utilizado"
                      onChange={(e) => setItem("steps", value.steps, i, { system: e.target.value })} />
                    <Input value={s.documents} placeholder="Documentos utilizados"
                      onChange={(e) => setItem("steps", value.steps, i, { documents: e.target.value })} />
                    <Input value={s.decision_criteria} placeholder="Critérios de decisão"
                      onChange={(e) => setItem("steps", value.steps, i, { decision_criteria: e.target.value })} />
                  </div>
                  <Input value={s.expected_result} placeholder="Resultado esperado"
                    onChange={(e) => setItem("steps", value.steps, i, { expected_result: e.target.value })} />
                  <UnknownHint value={s.responsible} />
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" onClick={() => moveStep(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => moveStep(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => removeItem("steps", value.steps, i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section n={8} title="Regras de Negócio" hint="Aprovações, exceções, obrigatoriedades, limites e validações.">
        <ListEditor items={value.business_rules} placeholder="Regra de negócio" onChange={(v) => set("business_rules", v)} />
      </Section>

      <Section n={9} title="Pontos de Controle" hint="Conferências, validações, assinaturas e registros.">
        <ListEditor items={value.control_points} placeholder="Ponto de controle" onChange={(v) => set("control_points", v)} />
      </Section>

      <Section
        n={10}
        title="Riscos do Processo"
        action={
          <Button variant="outline" size="sm" onClick={() => set("risks", [...value.risks, { description: "", impact: "", mitigation: "" } as PopRisk])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Risco
          </Button>
        }
      >
        {value.risks.length === 0 && <p className="text-xs text-muted-foreground">Nenhum risco.</p>}
        {value.risks.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]">
            <Input placeholder="Risco" value={r.description}
              onChange={(e) => setItem("risks", value.risks, i, { description: e.target.value })} />
            <Input placeholder="Impacto" value={r.impact}
              onChange={(e) => setItem("risks", value.risks, i, { impact: e.target.value })} />
            <Input placeholder="Mitigação" value={r.mitigation}
              onChange={(e) => setItem("risks", value.risks, i, { mitigation: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => removeItem("risks", value.risks, i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Section>

      <Section
        n={11}
        title="Indicadores sugeridos"
        hint="Tempo médio, SLA, lead time, retrabalho, produtividade, pendências."
        action={
          <Button variant="outline" size="sm" onClick={() => set("indicators", [...value.indicators, { name: "", description: "", formula: "", goal: "" } as PopIndicator])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Indicador
          </Button>
        }
      >
        {value.indicators.length === 0 && <p className="text-xs text-muted-foreground">Nenhum indicador.</p>}
        {value.indicators.map((ind, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_1fr_auto]">
            <Input placeholder="Nome" value={ind.name}
              onChange={(e) => setItem("indicators", value.indicators, i, { name: e.target.value })} />
            <Input placeholder="Como medir / por que importa" value={ind.description}
              onChange={(e) => setItem("indicators", value.indicators, i, { description: e.target.value })} />
            <Input placeholder="Fórmula" value={ind.formula}
              onChange={(e) => setItem("indicators", value.indicators, i, { formula: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => removeItem("indicators", value.indicators, i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Section>

      <Section n={12} title="Saídas & Sistemas utilizados">
        <div className="grid gap-4 sm:grid-cols-2">
          <ListEditor label="Saídas" items={value.outputs} placeholder="Resultado ou entregável" onChange={(v) => set("outputs", v)} />
          <ListEditor label="Sistemas" items={value.systems} placeholder="ERP, SEI, e-mail, Excel..." onChange={(v) => set("systems", v)} />
        </div>
      </Section>

      <Section n={13} title="Documentos Relacionados & Pontos de Atenção">
        <div className="grid gap-4 sm:grid-cols-2">
          <ListEditor label="Documentos" items={value.related_documents} placeholder="Formulário, planilha, contrato..." onChange={(v) => set("related_documents", v)} />
          <ListEditor label="Pontos de atenção" items={value.attention_points} placeholder="Exceção ou cuidado" onChange={(v) => set("attention_points", v)} />
        </div>
      </Section>

      <Section n={14} title="Observações">
        <Textarea rows={4} value={value.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Campo livre" />
      </Section>
    </div>
  );
}
