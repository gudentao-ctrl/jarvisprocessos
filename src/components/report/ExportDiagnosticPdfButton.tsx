import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export type DiagnosticContent = {
  resumo?: string;
  principais_dores?: string[];
  causas_sistemicas?: string[];
  processos_criticos?: string[];
  gargalos?: string[];
  riscos?: string[];
  oportunidades?: string[];
  projetos_recomendados?: Array<{ nome: string; descricao: string; prazo: string }>;
};

const SECTIONS: Array<{ key: keyof DiagnosticContent; label: string }> = [
  { key: "principais_dores", label: "Principais dores" },
  { key: "causas_sistemicas", label: "Causas sistêmicas" },
  { key: "processos_criticos", label: "Processos críticos" },
  { key: "gargalos", label: "Gargalos" },
  { key: "riscos", label: "Riscos" },
  { key: "oportunidades", label: "Oportunidades" },
];

const PRAZO: Record<string, string> = { curto: "Curto prazo", medio: "Médio prazo", longo: "Longo prazo" };

export function ExportDiagnosticPdfButton({
  title,
  content,
  subtitle,
}: {
  title: string;
  content: DiagnosticContent;
  subtitle?: string;
}) {
  const [busy, setBusy] = useState(false);

  function exportPdf() {
    setBusy(true);
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const M = 18;
      const MAX = W - M * 2;
      let y = 0;

      const orange: [number, number, number] = [234, 115, 22];
      const dark: [number, number, number] = [38, 38, 45];
      const gray: [number, number, number] = [110, 110, 120];

      function header() {
        pdf.setFillColor(...orange);
        pdf.rect(0, 0, W, 14, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text("JARVIS — Diagnóstico Executivo", M, 9);
        y = 26;
      }

      function ensure(need: number) {
        if (y + need > H - M) {
          pdf.addPage();
          header();
        }
      }

      function paragraph(text: string, size = 10, style: "normal" | "bold" = "normal", color = dark, indent = 0) {
        pdf.setFont("helvetica", style);
        pdf.setFontSize(size);
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, MAX - indent) as string[];
        for (const line of lines) {
          ensure(size * 0.45 + 2);
          pdf.text(line, M + indent, y);
          y += size * 0.45 + 2;
        }
      }

      function sectionTitle(label: string) {
        ensure(14);
        pdf.setFillColor(...orange);
        pdf.rect(M, y - 4, 1.6, 5.5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(...dark);
        pdf.text(label, M + 5, y);
        y += 7;
      }

      header();

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(...dark);
      const tLines = pdf.splitTextToSize(title || "Diagnóstico executivo", MAX) as string[];
      for (const l of tLines) {
        ensure(9);
        pdf.text(l, M, y);
        y += 8;
      }
      const metaBits = [subtitle, new Date().toLocaleDateString("pt-BR")].filter(Boolean).join("  •  ");
      paragraph(metaBits, 9, "normal", gray);
      y += 4;

      if (content.resumo?.trim()) {
        sectionTitle("Resumo executivo");
        paragraph(content.resumo.trim());
        y += 4;
      }

      for (const { key, label } of SECTIONS) {
        const items = ((content[key] as string[]) ?? []).filter((i) => i?.trim());
        if (!items.length) continue;
        sectionTitle(label);
        for (const item of items) {
          paragraph("•  " + item.trim(), 10, "normal", dark, 2);
          y += 1;
        }
        y += 4;
      }

      const projetos = (content.projetos_recomendados ?? []).filter((p) => p?.nome?.trim() || p?.descricao?.trim());
      if (projetos.length) {
        sectionTitle("Projetos recomendados");
        projetos.forEach((p, i) => {
          paragraph(`${i + 1}. ${p.nome || "Projeto"} — ${PRAZO[p.prazo] ?? p.prazo ?? ""}`, 10, "bold");
          if (p.descricao?.trim()) paragraph(p.descricao.trim(), 9.5, "normal", gray, 4);
          y += 3;
        });
      }

      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...gray);
        pdf.text(`Página ${i} de ${total}`, W - M, H - 8, { align: "right" });
      }

      const slug = (title || "diagnostico").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      pdf.save(`${slug || "diagnostico"}.pdf`);
      toast.success("PDF gerado");
    } catch (e) {
      console.error("[ExportDiagnosticPdf]", e);
      toast.error((e as Error)?.message ?? "Falha ao gerar PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={exportPdf} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
      Exportar PDF
    </Button>
  );
}
