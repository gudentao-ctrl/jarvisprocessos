import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { getTemplateForCompany } from "@/lib/document-templates.functions";

/* Exporta o documento do processo em PDF, aplicando o template
 * de branding da empresa ativa (logos, cores, cabeçalho/rodapé). */

export function ExportProcessPdfButton({
  containerId,
  processName,
  companyId,
  companyName,
  processCode,
}: {
  containerId: string;
  processName: string;
  companyId?: string | null;
  companyName?: string | null;
  processCode?: string | null;
}) {
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    setBusy(true);
    try {
      const root = document.getElementById(containerId);
      if (!root) throw new Error("Container do documento não encontrado");

      const tpl = await getTemplateForCompany({ data: { company_id: companyId ?? null } }).catch(() => null);
      const primary = tpl?.primary_color ?? "#0f172a";
      const accent = tpl?.accent_color ?? "#3b82f6";
      const font = tpl?.font_family ?? "Inter, system-ui, sans-serif";
      const header = tpl?.header_html ?? "";
      const footer = tpl?.footer_html ?? "";
      const code = processCode ?? `${tpl?.code_prefix ?? "PRC"}-${String(tpl?.numbering_seed ?? 1).padStart(4, "0")}`;

      const canvas = await html2canvas(root, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const marginX = 12;
      const marginTop = 22;
      const marginBottom = 16;
      const imgW = pageW - marginX * 2;

      // ---------- CAPA ----------
      pdf.setFillColor(primary);
      pdf.rect(0, 0, pageW, 55, "F");
      pdf.setTextColor("#ffffff");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      if (header) pdf.text(stripHtml(header).slice(0, 90), marginX, 18);
      pdf.setFontSize(22);
      pdf.text("Documento de Processo", marginX, 38);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(companyName ?? "", marginX, 47);

      // logos (best-effort)
      const consLogo = await loadImage(tpl?.consultancy_logo_url);
      const cliLogo = await loadImage(tpl?.client_logo_url);
      if (consLogo) safeAddImage(pdf, consLogo, pageW - marginX - 30, 8, 30, 15);
      if (cliLogo) safeAddImage(pdf, cliLogo, pageW - marginX - 30, 28, 30, 15);

      pdf.setTextColor(primary);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(wrap(pdf, processName, pageW - marginX * 2), marginX, 80);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(accent);
      pdf.text(`Código: ${code}`, marginX, 100);
      pdf.setTextColor("#334155");
      pdf.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")}`, marginX, 108);

      // ---------- CONTEÚDO ----------
      pdf.addPage();

      const contentH = pageH - marginTop - marginBottom;
      const imgH = (canvas.height * imgW) / canvas.width;
      let renderedPages = 1;

      if (imgH <= contentH) {
        drawHeaderFooter(pdf, { pageW, pageH, marginX, primary, accent, font, header, footer, page: 2, total: 2, code, companyName });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", marginX, marginTop, imgW, imgH);
      } else {
        const perPageCanvasH = Math.floor((canvas.width * contentH) / imgW);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = perPageCanvasH;
        const ctx = pageCanvas.getContext("2d")!;
        let y = 0;
        let first = true;
        const totalContentPages = Math.ceil(canvas.height / perPageCanvasH);
        const totalPages = 1 + totalContentPages;
        while (y < canvas.height) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, -y);
          if (!first) pdf.addPage();
          const currentPageIndex = first ? 2 : 1 + renderedPages + 1;
          drawHeaderFooter(pdf, {
            pageW, pageH, marginX, primary, accent, font, header, footer,
            page: currentPageIndex, total: totalPages, code, companyName,
          });
          pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.92), "JPEG", marginX, marginTop, imgW, contentH);
          first = false;
          renderedPages++;
          y += perPageCanvasH;
        }
      }

      const safe = processName.replace(/[^\w\-]+/g, "_").slice(0, 60) || "processo";
      pdf.save(`${safe}.pdf`);
      toast.success("PDF gerado");
    } catch (e: any) {
      console.error("[ExportProcessPdf]", e);
      toast.error(e?.message ?? "Falha ao gerar PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={exportPdf} disabled={busy}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Exportar PDF
    </Button>
  );
}

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "").trim();
}

function wrap(pdf: jsPDF, text: string, maxW: number): string[] {
  return pdf.splitTextToSize(text, maxW) as string[];
}

async function loadImage(url?: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function safeAddImage(pdf: jsPDF, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    pdf.addImage(c.toDataURL("image/png"), "PNG", x, y, w, h);
  } catch { /* ignore CORS-tainted */ }
}

function drawHeaderFooter(
  pdf: jsPDF,
  opts: {
    pageW: number; pageH: number; marginX: number;
    primary: string; accent: string; font: string;
    header: string; footer: string;
    page: number; total: number; code: string; companyName?: string | null;
  },
) {
  const { pageW, pageH, marginX, primary, accent, header, footer, page, total, code, companyName } = opts;
  // header line
  pdf.setDrawColor(primary);
  pdf.setLineWidth(0.4);
  pdf.line(marginX, 14, pageW - marginX, 14);
  pdf.setFontSize(8);
  pdf.setTextColor(primary);
  pdf.setFont("helvetica", "bold");
  if (header) pdf.text(stripHtml(header).slice(0, 80), marginX, 10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(accent);
  const right = [companyName, code].filter(Boolean).join(" · ");
  if (right) pdf.text(right, pageW - marginX, 10, { align: "right" });

  // footer line
  pdf.setDrawColor(primary);
  pdf.line(marginX, pageH - 12, pageW - marginX, pageH - 12);
  pdf.setFontSize(8);
  pdf.setTextColor("#475569");
  const rendered = (footer || "").replace("{page}", String(page)).replace("{total}", String(total));
  if (rendered) pdf.text(stripHtml(rendered).slice(0, 100), marginX, pageH - 6);
  pdf.text(`${page}/${total}`, pageW - marginX, pageH - 6, { align: "right" });
}
