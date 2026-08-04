import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { popProcessName, type PopContent } from "@/lib/pop-types";

function lines(doc: jsPDF, text: string, width: number) {
  return doc.splitTextToSize(text || "-", width) as string[];
}

function fileBase(pop: PopContent) {
  return `POP-${(popProcessName(pop) || "processo").replace(/\W+/g, "-").toLowerCase()}`;
}

export function ExportPopPdfButton({ pop, companyName }: { pop: PopContent; companyName?: string }) {
  function exportPdf() {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const M = 18;
      const W = doc.internal.pageSize.getWidth() - M * 2;
      const H = doc.internal.pageSize.getHeight();
      let y = M;

      const ensure = (h: number) => {
        if (y + h > H - M) { doc.addPage(); y = M; }
      };
      const title = (t: string) => {
        ensure(14);
        doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(20, 40, 90);
        doc.text(t, M, y);
        y += 2;
        doc.setDrawColor(200).line(M, y, M + W, y);
        y += 6;
        doc.setTextColor(30);
      };
      const body = (t: string, indent = 0) => {
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(30);
        for (const l of lines(doc, t, W - indent)) { ensure(6); doc.text(l, M + indent, y); y += 5; }
        y += 2;
      };
      const kv = (k: string, v: string) => {
        doc.setFont("helvetica", "bold").setFontSize(9.5);
        const label = `${k}: `;
        const lw = doc.getTextWidth(label);
        const parts = lines(doc, v || "-", W - lw);
        ensure(6);
        doc.text(label, M, y);
        doc.setFont("helvetica", "normal");
        doc.text(parts[0] ?? "-", M + lw, y);
        y += 5;
        for (const l of parts.slice(1)) { ensure(6); doc.text(l, M + lw, y); y += 5; }
      };
      const bullets = (items: string[]) => {
        if (!items.length) return body("-");
        doc.setFont("helvetica", "normal").setFontSize(10);
        for (const it of items) {
          for (const [i, l] of lines(doc, it, W - 5).entries()) {
            ensure(6);
            doc.text(i === 0 ? `•  ${l}` : `    ${l}`, M, y);
            y += 5;
          }
        }
        y += 2;
      };

      const id = pop.identification;

      doc.setFont("helvetica", "bold").setFontSize(18);
      doc.text("Procedimento Operacional Padrão (POP)", M, y); y += 8;
      doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(90);
      doc.text([popProcessName(pop) || "Processo", companyName ?? ""].filter(Boolean).join(" — "), M, y);
      y += 4;
      doc.setFontSize(9).text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, M, y);
      y += 8; doc.setTextColor(30);

      title("1. Identificação");
      kv("Nome do processo", id.process_name);
      kv("Código do POP", id.code);
      kv("Versão", id.version);
      kv("Data de emissão", id.issue_date);
      kv("Última revisão", id.last_revision);
      kv("Responsável pelo processo", id.process_owner);
      kv("Área responsável", id.area);
      kv("Elaborado por", id.prepared_by);
      kv("Aprovado por", id.approved_by);
      y += 3;

      title("2. Objetivo"); body(pop.objective);
      title("3. Aplicação / Escopo"); body(pop.scope);

      title("4. Definições");
      if (!pop.definitions.length) body("-");
      else for (const d of pop.definitions) kv(d.term || "-", d.definition);
      y += 3;

      title("5. Responsabilidades");
      if (!pop.responsibilities.length) body("-");
      else for (const r of pop.responsibilities) {
        doc.setFont("helvetica", "bold").setFontSize(10);
        ensure(6); doc.text(`${r.role || "-"}${r.job_function ? ` — ${r.job_function}` : ""}`, M, y); y += 5;
        doc.setFont("helvetica", "normal");
        if (r.responsibility) body(r.responsibility, 6);
      }

      title("6. Entradas"); bullets(pop.inputs);

      title("7. Procedimento Operacional");
      pop.steps.forEach((s, i) => {
        doc.setFont("helvetica", "bold").setFontSize(10.5);
        for (const l of lines(doc, `${i + 1}. ${s.title}`, W)) { ensure(6); doc.text(l, M, y); y += 5; }
        doc.setFont("helvetica", "normal").setFontSize(10);
        if (s.description) body(s.description, 6);
        const meta: Array<[string, string]> = [
          ["Responsável", s.responsible],
          ["Documentos", s.documents],
          ["Sistema", s.system],
          ["Critérios de decisão", s.decision_criteria],
          ["Resultado esperado", s.expected_result],
        ];
        doc.setFontSize(9).setTextColor(90);
        for (const [k, v] of meta) {
          if (!v) continue;
          for (const [i2, l] of lines(doc, `${k}: ${v}`, W - 6).entries()) {
            ensure(5); doc.text(i2 === 0 ? l : `  ${l}`, M + 6, y); y += 4.5;
          }
        }
        doc.setTextColor(30).setFontSize(10);
        y += 3;
      });
      if (!pop.steps.length) body("-");

      title("8. Regras de Negócio"); bullets(pop.business_rules);
      title("9. Pontos de Controle"); bullets(pop.control_points);

      title("10. Riscos do Processo");
      if (!pop.risks.length) body("-");
      else bullets(pop.risks.map((r) => [r.description, r.impact && `Impacto: ${r.impact}`, r.mitigation && `Mitigação: ${r.mitigation}`].filter(Boolean).join(" | ")));

      title("11. Indicadores sugeridos");
      bullets(pop.indicators.map((i) => [i.name, i.description, i.formula && `Fórmula: ${i.formula}`, i.goal && `Meta: ${i.goal}`].filter(Boolean).join(" — ")));

      title("12. Saídas"); bullets(pop.outputs);
      title("13. Sistemas utilizados"); bullets(pop.systems);
      title("14. Documentos Relacionados"); bullets(pop.related_documents);
      title("15. Pontos de Atenção"); bullets(pop.attention_points);
      title("16. Observações"); body(pop.notes);

      doc.save(`${fileBase(pop)}.pdf`);
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
