import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import type { PopContent } from "@/lib/pop-types";

function lines(doc: jsPDF, text: string, width: number) {
  return doc.splitTextToSize(text || "-", width) as string[];
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
        ensure(12);
        doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(20, 40, 90);
        doc.text(t, M, y);
        y += 2;
        doc.setDrawColor(200).line(M, y, M + W, y);
        y += 6;
        doc.setTextColor(30);
      };
      const body = (t: string) => {
        doc.setFont("helvetica", "normal").setFontSize(10);
        for (const l of lines(doc, t, W)) { ensure(6); doc.text(l, M, y); y += 5; }
        y += 3;
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
        y += 3;
      };

      doc.setFont("helvetica", "bold").setFontSize(18);
      doc.text("Procedimento Operacional Padrão (POP)", M, y); y += 8;
      doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(90);
      doc.text([pop.process_name || "Processo", companyName ?? ""].filter(Boolean).join(" — "), M, y);
      y += 4;
      doc.setFontSize(9).text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, M, y);
      y += 8; doc.setTextColor(30);

      title("Objetivo"); body(pop.objective);
      title("Escopo"); body(pop.scope);
      title("Responsáveis"); bullets(pop.responsibles);
      title("Entradas"); bullets(pop.inputs);

      title("Procedimento Operacional");
      pop.steps.forEach((s, i) => {
        doc.setFont("helvetica", "bold").setFontSize(10);
        for (const l of lines(doc, `${i + 1}. ${s.title}`, W)) { ensure(6); doc.text(l, M, y); y += 5; }
        doc.setFont("helvetica", "normal");
        if (s.description) for (const l of lines(doc, s.description, W - 6)) { ensure(6); doc.text(l, M + 6, y); y += 5; }
        if (s.responsible) { ensure(6); doc.setTextColor(110).text(`Responsável: ${s.responsible}`, M + 6, y); doc.setTextColor(30); y += 5; }
        y += 2;
      });
      if (!pop.steps.length) body("-");

      title("Saídas"); bullets(pop.outputs);
      title("Pontos de Atenção"); bullets(pop.attention_points);
      title("Indicadores sugeridos");
      bullets(pop.indicators.map((i) => (i.description ? `${i.name} — ${i.description}` : i.name)));

      doc.save(`POP-${(pop.process_name || "processo").replace(/\W+/g, "-").toLowerCase()}.pdf`);
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
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

      const h = (t: string) =>
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: t, bold: true })] });
      const p = (t: string) => new Paragraph({ children: [new TextRun(t || "-")], spacing: { after: 80 } });
      const li = (items: string[]) =>
        items.length
          ? items.map((t) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(t)] }))
          : [p("-")];

      const steps: any[] = [];
      pop.steps.forEach((s, i) => {
        steps.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: `${i + 1}. ${s.title}`, bold: true })] }));
        if (s.description) steps.push(new Paragraph({ children: [new TextRun(s.description)] }));
        if (s.responsible) steps.push(new Paragraph({ children: [new TextRun({ text: `Responsável: ${s.responsible}`, italics: true })] }));
      });
      if (!steps.length) steps.push(p("-"));

      const doc = new Document({
        styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
        sections: [
          {
            properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
            children: [
              new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: "Procedimento Operacional Padrão (POP)", bold: true, size: 34 })] }),
              new Paragraph({ children: [new TextRun({ text: [pop.process_name || "Processo", companyName ?? ""].filter(Boolean).join(" — "), color: "555555" })], spacing: { after: 240 } }),
              h("Objetivo"), p(pop.objective),
              h("Escopo"), p(pop.scope),
              h("Responsáveis"), ...li(pop.responsibles),
              h("Entradas"), ...li(pop.inputs),
              h("Procedimento Operacional"), ...steps,
              h("Saídas"), ...li(pop.outputs),
              h("Pontos de Atenção"), ...li(pop.attention_points),
              h("Indicadores sugeridos"),
              ...li(pop.indicators.map((i) => (i.description ? `${i.name} — ${i.description}` : i.name))),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `POP-${(pop.process_name || "processo").replace(/\W+/g, "-").toLowerCase()}.docx`;
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
