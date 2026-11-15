import type { MeetingReport } from "@/lib/meeting-report";
import { Card } from "@/components/ui/card";

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-bold">{title} <span className="text-muted-foreground">({items.length})</span></h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nada identificado na fala.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
      )}
    </Card>
  );
}

export function MeetingReportView({ report }: { report: MeetingReport }) {
  return (
    <div className="space-y-3">
      <Section title="Principais pontos citados" items={report.summary} />
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-bold">Ações das partes envolvidas <span className="text-muted-foreground">({report.actions.length})</span></h3>
        {report.actions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nada identificado na fala.</p>
        ) : (
          <div className="space-y-2">
            {report.actions.map((a, i) => (
              <div key={i} className="rounded-lg border p-2 text-sm">
                <p>{a.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Responsável: <strong>{a.owner || "não citado"}</strong> · Prazo: <strong>{a.deadline || "não citado"}</strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Section title="Prazos mencionados" items={report.deadlines} />
      <Section title="Processos pendentes" items={report.pending} />
      <Section title="Validações realizadas" items={report.validations} />
    </div>
  );
}
