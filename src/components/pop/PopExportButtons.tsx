import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { popProcessName, type PopContent } from "@/lib/pop-types";
import { buildPopPdf } from "./pop-pdf";

function fileBase(pop: PopContent) {
  return `POP-${(popProcessName(pop) || "processo").replace(/\W+/g, "-").toLowerCase()}`;
}

export function ExportPopPdfButton({ pop, companyName }: { pop: PopContent; companyName?: string }) {
  function exportPdf() {
    try {
      buildPopPdf(pop, companyName).save(`${fileBase(pop)}.pdf`);
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar PDF");
    }
  }

  return (
    <Button variant="outline" onClick={exportPdf}>
      <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
    </Button>
  );
}


export function ExportPopWordButton({ pop, companyName }: { pop: PopContent; companyName?: string }) {
  const [busy, setBusy] = useState(false);

  async function exportDocx() {
    setBusy(true);
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } =
        await import("docx");

      const h = (t: string) =>
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: t, bold: true })] });
      const p = (t: string) => new Paragraph({ children: [new TextRun(t || "-")], spacing: { after: 80 } });
      const li = (items: string[]) =>
        items.length ? items.map((t) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(t)] })) : [p("-")];

      const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
      const borders = { top: border, bottom: border, left: border, right: border };
      const cell = (text: string, width: number, bold = false) =>
        new TableCell({
          borders,
          width: { size: width, type: WidthType.DXA },
          shading: bold ? { fill: "EDF2F7", type: ShadingType.CLEAR } : undefined,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: text || "-", bold })] })],
        });
      const table = (header: string[], rows: string[][], widths: number[]) =>
        new Table({
          width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
          columnWidths: widths,
          rows: [
            new TableRow({ children: header.map((t, i) => cell(t, widths[i]!, true)) }),
            ...(rows.length ? rows : [header.map(() => "-")]).map(
              (r) => new TableRow({ children: r.map((t, i) => cell(t, widths[i]!)) }),
            ),
          ],
        });

      const id = pop.identification;
      const idRows: string[][] = [
        ["Nome do processo", id.process_name],
        ["Código do POP", id.code],
        ["Versão", id.version],
        ["Data de emissão", id.issue_date],
        ["Última revisão", id.last_revision],
        ["Responsável pelo processo", id.process_owner],
        ["Área responsável", id.area],
        ["Elaborado por", id.prepared_by],
        ["Aprovado por", id.approved_by],
      ];

      const steps: any[] = [];
      pop.steps.forEach((s, i) => {
        steps.push(new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: `${i + 1}. ${s.title}`, bold: true })] }));
        if (s.description) steps.push(new Paragraph({ children: [new TextRun(s.description)] }));
        const meta: Array<[string, string]> = [
          ["Responsável", s.responsible],
          ["Documentos utilizados", s.documents],
          ["Sistema utilizado", s.system],
          ["Critérios de decisão", s.decision_criteria],
          ["Resultado esperado", s.expected_result],
        ];
        for (const [k, v] of meta) {
          if (!v) continue;
          steps.push(new Paragraph({ children: [new TextRun({ text: `${k}: `, bold: true, size: 18 }), new TextRun({ text: v, size: 18 })] }));
        }
      });
      if (!steps.length) steps.push(p("-"));

      const doc = new Document({
        styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
        sections: [
          {
            properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
            children: [
              new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: "Procedimento Operacional Padrão (POP)", bold: true, size: 34 })] }),
              new Paragraph({
                spacing: { after: 240 },
                children: [new TextRun({ text: [popProcessName(pop) || "Processo", companyName ?? ""].filter(Boolean).join(" — "), color: "555555" })],
              }),
              h("1. Identificação"),
              table(["Campo", "Conteúdo"], idRows, [3000, 6638]),
              h("2. Objetivo"), p(pop.objective),
              h("3. Aplicação / Escopo"), p(pop.scope),
              h("4. Definições"),
              table(["Termo", "Definição"], pop.definitions.map((d) => [d.term, d.definition]), [3000, 6638]),
              h("5. Responsabilidades"),
              table(
                ["Responsável", "Função", "Responsabilidade"],
                pop.responsibilities.map((r) => [r.role, r.job_function, r.responsibility]),
                [2600, 2400, 4638],
              ),
              h("6. Entradas"), ...li(pop.inputs),
              h("7. Procedimento Operacional"), ...steps,
              h("8. Regras de Negócio"), ...li(pop.business_rules),
              h("9. Pontos de Controle"), ...li(pop.control_points),
              h("10. Riscos do Processo"),
              table(["Risco", "Impacto", "Mitigação"], pop.risks.map((r) => [r.description, r.impact, r.mitigation]), [4000, 2000, 3638]),
              h("11. Indicadores sugeridos"),
              table(
                ["Indicador", "Descrição", "Fórmula", "Meta"],
                pop.indicators.map((i) => [i.name, i.description, i.formula, i.goal]),
                [2200, 3600, 2200, 1638],
              ),
              h("12. Saídas"), ...li(pop.outputs),
              h("13. Sistemas utilizados"), ...li(pop.systems),
              h("14. Documentos Relacionados"), ...li(pop.related_documents),
              h("15. Pontos de Atenção"), ...li(pop.attention_points),
              h("16. Observações"), p(pop.notes),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase(pop)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Word gerado");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar Word");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={exportDocx} disabled={busy}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
      Exportar Word
    </Button>
  );
}
