import { format, parseISO } from "date-fns";
import { renderChart, type ReportData } from "./charts";
import type { ReportBlock, ReportNarrative, ReportPeriod } from "@/lib/report-types";

type Meta = {
  company: { name: string } | null;
  period: ReportPeriod;
  generatedAt: string; // ISO
};

function Page({
  meta, pageNumber, totalPages, children,
}: { meta: Meta; pageNumber: number; totalPages: number; children: React.ReactNode }) {
  return (
    <section
      className="report-page relative mx-auto flex flex-col bg-white text-slate-900 shadow-sm"
      style={{ width: "210mm", minHeight: "297mm", padding: "18mm 16mm 22mm", pageBreakAfter: "always" }}
    >
      <header className="mb-4 flex items-center justify-between border-b-2 border-primary pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Jarvis Processos</p>
          <p className="text-lg font-bold leading-tight">{meta.company?.name ?? "Empresa"}</p>
        </div>
        <div className="text-right text-[10px] text-slate-500">
          <p>Relatório Executivo de Acompanhamento</p>
          <p>Período: {meta.period.from} a {meta.period.to}</p>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-slate-200 px-[16mm] py-2 text-[9px] text-slate-500">
        <span>Emitido em {format(parseISO(meta.generatedAt), "dd/MM/yyyy HH:mm")}</span>
        <span>Página {pageNumber} de {totalPages}</span>
      </footer>
    </section>
  );
}

function BlockBody({ block, data }: { block: ReportBlock; data: ReportData }) {
  switch (block.type) {
    case "chart":
      return (
        <div className="rounded-md border border-slate-200 p-2">
          {block.chartKey ? renderChart(block.chartKey, data) : null}
        </div>
      );
    case "summary":
    case "text":
      return <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.content || "—"}</p>;
    case "recommendations":
    case "kpis":
    case "actions_info":
    case "indicators_info":
    case "agenda_info":
    case "hours_info":
    case "crono_info":
    case "improvements_info":
      return <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">{block.content || "—"}</div>;
    case "image":
      return block.imageDataUrl ? (
        <figure>
          <img src={block.imageDataUrl} alt={block.imageCaption ?? ""} className="max-h-[180mm] w-full rounded-md object-contain" />
          {block.imageCaption && <figcaption className="mt-2 text-center text-xs text-slate-500">{block.imageCaption}</figcaption>}
        </figure>
      ) : <p className="text-sm text-slate-400">Sem imagem</p>;
    case "table":
      return block.tableRows && block.tableRows.length ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>{block.tableRows[0].map((h, i) => <th key={i} className="border bg-slate-100 px-2 py-1 text-left font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {block.tableRows.slice(1).map((row, i) => (
              <tr key={i}>{row.map((c, j) => <td key={j} className="border px-2 py-1">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      ) : <p className="text-sm text-slate-400">Tabela vazia</p>;
  }
}

export function ReportPreview({
  blocks, data, meta,
}: {
  blocks: ReportBlock[];
  data: ReportData;
  meta: Meta;
}) {
  const visible = blocks.filter((b) => b.enabled);
  const total = Math.max(visible.length, 1);
  return (
    <div id="report-print-root" className="space-y-4 bg-slate-100 p-4">
      {visible.map((b, i) => (
        <Page key={b.id} meta={meta} pageNumber={i + 1} totalPages={total}>
          <h2 className="mb-3 text-xl font-bold text-slate-900">{b.title}</h2>
          <BlockBody block={b} data={data} />
        </Page>
      ))}
      {visible.length === 0 && (
        <div className="grid h-40 place-items-center text-sm text-muted-foreground">
          Ative pelo menos um bloco para pré-visualizar o relatório.
        </div>
      )}
    </div>
  );
}

export function narrativeToBlocks(n: ReportNarrative): Partial<Record<string, string>> {
  return {
    summary: n.resumo_executivo,
    recommendations: [
      "**Recomendações da consultoria**",
      ...n.recomendacoes.map((r) => `• ${r}`),
      "",
      "**Principais gargalos**",
      ...n.gargalos.map((r) => `• ${r}`),
      "",
      "**Riscos**",
      ...n.riscos.map((r) => `• ${r}`),
      "",
      "**Oportunidades**",
      ...n.oportunidades.map((r) => `• ${r}`),
      "",
      "**Próximos passos**",
      ...n.proximos_passos.map((r) => `• ${r}`),
    ].join("\n"),
  };
}
