import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { isUnknown, type PopContent } from "@/lib/pop-types";

const SECTIONS: Array<{ label: string; get: (p: PopContent) => boolean }> = [
  { label: "Identificação", get: (p) => Boolean(p.identification.process_name && p.identification.code && p.identification.process_owner) },
  { label: "Objetivo", get: (p) => p.objective.trim().length > 80 && !isUnknown(p.objective) },
  { label: "Escopo", get: (p) => p.scope.trim().length > 40 && !isUnknown(p.scope) },
  { label: "Definições", get: (p) => p.definitions.length > 0 },
  { label: "Responsabilidades", get: (p) => p.responsibilities.length > 0 },
  { label: "Entradas", get: (p) => p.inputs.length > 0 },
  { label: "Procedimento", get: (p) => p.steps.length >= 3 && p.steps.every((s) => s.title && s.description) },
  { label: "Regras de negócio", get: (p) => p.business_rules.length > 0 },
  { label: "Pontos de controle", get: (p) => p.control_points.length > 0 },
  { label: "Riscos", get: (p) => p.risks.length > 0 },
  { label: "Indicadores", get: (p) => p.indicators.length > 0 },
  { label: "Saídas", get: (p) => p.outputs.length > 0 },
  { label: "Sistemas", get: (p) => p.systems.length > 0 },
  { label: "Documentos", get: (p) => p.related_documents.length > 0 },
];

export function PopQuality({ pop }: { pop: PopContent }) {
  const results = useMemo(() => SECTIONS.map((s) => ({ label: s.label, ok: s.get(pop) })), [pop]);
  const done = results.filter((r) => r.ok).length;
  const pct = Math.round((done / results.length) * 100);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Maturidade do documento</h3>
          <p className="text-xs text-muted-foreground">
            {done} de {results.length} seções completas — quanto maior, mais robusto o PDF gerado.
          </p>
        </div>
        <span className="text-2xl font-bold text-primary">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {results.map((r) => (
          <span
            key={r.label}
            className={
              r.ok
                ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600"
                : "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600"
            }
          >
            {r.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {r.label}
          </span>
        ))}
      </div>
    </Card>
  );
}
