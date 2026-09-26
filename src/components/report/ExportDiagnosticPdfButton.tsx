import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { EXECUTIVE_PILLARS, type ExecutiveDiagnosticContent } from "@/lib/executive-diagnostic-types";

const LEGACY_SECTIONS: Array<{ key: keyof ExecutiveDiagnosticContent; label: string }> = [
  { key: "principais_dores", label: "Principais dores" },
  { key: "causas_sistemicas", label: "Causas sistêmicas" },
  { key: "processos_criticos", label: "Processos críticos" },
  { key: "gargalos", label: "Gargalos" },
  { key: "riscos", label: "Riscos" },
  { key: "oportunidades", label: "Oportunidades" },
];
const PRAZO: Record<string, string> = { curto: "Curto prazo", medio: "Médio prazo", longo: "Longo prazo" };

export function ExportDiagnosticPdfButton({ title, content, subtitle, logos }: {
  title: string;
  content: ExecutiveDiagnosticContent;
  subtitle?: string;
  logos?: { company?: string | null; consultancy?: string | null };
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

      function addLogo(value: string | null | undefined, x: number) {
        if (!value) return;
        try {
          const format = value.startsWith("data:image/jpeg") || value.startsWith("data:image/jpg") ? "JPEG" : "PNG";
          pdf.addImage(value, format, x, 3, 28, 8);
        } catch { /* logo inválido não interrompe o relatório */ }
      }
      function header() {
        pdf.setFillColor(...orange);
        pdf.rect(0, 0, W, 15, "F");
        addLogo(logos?.consultancy, M);
        addLogo(logos?.company, W - M - 28);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text("JARVIS — Diagnóstico Executivo", W / 2, 9, { align: "center" });
        y = 27;
      }
      function ensure(need: number) {
        if (y + need > H - M) { pdf.addPage(); header(); }
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
        const lines = pdf.splitTextToSize(label, MAX - 5) as string[];
        pdf.text(lines, M + 5, y);
        y += lines.length * 5 + 3;
      }
      function bulletGroup(label: string, items: string[]) {
        const valid = items.filter((item) => item.trim());
        if (!valid.length) return;
        ensure(10);
        paragraph(label, 9.5, "bold", orange);
        for (const item of valid) { paragraph(`• ${item.trim()}`, 9.5, "normal", dark, 2); y += 1; }
        y += 2;
      }

      header();
      paragraph(title || "Diagnóstico Executivo", 18, "bold");
      paragraph([subtitle, new Date().toLocaleDateString("pt-BR")].filter(Boolean).join("  •  "), 9, "normal", gray);
      y += 4;
      const included = new Set(content.included_sections ?? ["resumo", ...EXECUTIVE_PILLARS.map((pillar) => pillar.key)]);
      if (included.has("resumo") && content.resumo?.trim()) { sectionTitle("Resumo executivo"); paragraph(content.resumo.trim()); y += 5; }

      if (content.pilares) {
        for (const pillar of EXECUTIVE_PILLARS) {
          if (!included.has(pillar.key)) continue;
          const value = content.pilares[pillar.key];
          sectionTitle(pillar.label);
          bulletGroup("Características positivas", value?.positivos ?? []);
          bulletGroup("Problemas identificados", value?.problemas ?? []);
          bulletGroup("Propostas de intervenção", value?.intervencoes ?? []);
          if (!(value?.positivos.length || value?.problemas.length || value?.intervencoes.length)) paragraph("Sem evidências registradas para este pilar.", 9.5, "normal", gray);
          y += 4;
        }
      } else {
        for (const { key, label } of LEGACY_SECTIONS) {
          const items = ((content[key] as string[]) ?? []).filter((item) => item?.trim());
          if (!items.length) continue;
          sectionTitle(label);
          for (const item of items) { paragraph(`• ${item.trim()}`, 10, "normal", dark, 2); y += 1; }
          y += 4;
        }
        const projects = (content.projetos_recomendados ?? []).filter((project) => project?.nome?.trim() || project?.descricao?.trim());
        if (projects.length) {
          sectionTitle("Projetos recomendados");
          projects.forEach((project, index) => {
            paragraph(`${index + 1}. ${project.nome || "Projeto"} — ${PRAZO[project.prazo] ?? project.prazo ?? ""}`, 10, "bold");
            if (project.descricao?.trim()) paragraph(project.descricao.trim(), 9.5, "normal", gray, 4);
            y += 3;
          });
        }
      }
      const total = pdf.getNumberOfPages();
      for (let index = 1; index <= total; index++) {
        pdf.setPage(index);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...gray);
        pdf.text(`Página ${index} de ${total}`, W - M, H - 8, { align: "right" });
      }
      const slug = (title || "diagnostico").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      pdf.save(`${slug || "diagnostico"}.pdf`);
      toast.success("PDF gerado");
    } catch (error) {
      console.error("[ExportDiagnosticPdf]", error);
      toast.error((error as Error)?.message ?? "Falha ao gerar PDF");
    } finally { setBusy(false); }
  }

  return <Button variant="outline" onClick={exportPdf} disabled={busy}>{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}Exportar PDF</Button>;
}