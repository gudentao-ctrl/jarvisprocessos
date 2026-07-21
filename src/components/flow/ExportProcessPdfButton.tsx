import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Canvg } from "canvg";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTemplateForCompany } from "@/lib/document-templates.functions";
import { renderBpmnSvg } from "./BpmnRenderer";
import { validateFlow, hasBlockingErrors } from "@/lib/flow-validate";
import type { FlowActivity, FlowConnection, FlowDecision } from "./FlowEditor";

/* Exportação PDF profissional do processo.
 * - Motor 100% baseado em jsPDF (sem html2canvas do container).
 * - BPMN renderizado como SVG via bpmn-js, embutido em alta resolução.
 * - Quebra de página inteligente, cabeçalho e rodapé em todas as páginas. */

type Format = "auto" | "a4" | "a3" | "letter";
type Orientation = "portrait" | "landscape";

type Sections = {
  cover: boolean;
  toc: boolean;
  general: boolean;
  matrix: boolean;
  bpmn: boolean;
  legend: boolean;
  indicators: boolean;
  plans: boolean;
  crono: boolean;
  history: boolean;
  approval: boolean;
};

export type ExportProcessPdfProps = {
  /** legado — não usamos mais html2canvas do container */
  containerId?: string;
  processName: string;
  processObjective?: string | null;
  processScope?: string | null;
  processResponsible?: string | null;
  processInputs?: string | null;
  processOutputs?: string | null;
  processDescription?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  processCode?: string | null;
  activities: FlowActivity[];
  connections: FlowConnection[];
  decisions: FlowDecision[];
  indicators?: Array<{ id: string; name: string; unit?: string | null; target?: number | null }>;
  plans?: Array<{ id: string; title: string; status?: string; priority?: string }>;
  crono?: Array<{ id: string; production_line?: string | null; product?: string | null; observation_date?: string | null }>;
};

export function ExportProcessPdfButton(props: ExportProcessPdfProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<Format>("auto");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [title, setTitle] = useState(props.processName);
  const [objective, setObjective] = useState(props.processObjective ?? "");
  const [scope, setScope] = useState(props.processDescription ?? "");
  const [notes, setNotes] = useState("");
  const [sections, setSections] = useState<Sections>({
    cover: true, toc: true, general: true, matrix: true, bpmn: true, legend: true,
    indicators: true, plans: true, crono: true, history: false, approval: true,
  });

  const issues = useMemo(
    () => validateFlow(props.activities, props.connections, props.decisions),
    [props.activities, props.connections, props.decisions],
  );
  const blocked = hasBlockingErrors(issues);

  async function generate() {
    if (blocked) {
      toast.error("Corrija os erros críticos antes de exportar.");
      return;
    }
    setBusy(true);
    try {
      const tpl = await getTemplateForCompany({ data: { company_id: props.companyId ?? null } }).catch(() => null);
      const primary = tpl?.primary_color ?? "#0f172a";
      const accent = tpl?.accent_color ?? "#3b82f6";
      const header = tpl?.header_html ?? "";
      const footer = tpl?.footer_html ?? "Documento confidencial — uso interno";
      const code = props.processCode ?? `${tpl?.code_prefix ?? "PRC"}-${String(tpl?.numbering_seed ?? 1).padStart(4, "0")}`;
      const version = "1.0";
      const consultant = "Consultor responsável";

      // Pré-medir BPMN para escolher formato automaticamente (Auto).
      let bpmnSvg: string | null = null;
      let bpmnAspect = 16 / 9;
      if (sections.bpmn && props.activities.length > 0) {
        try {
          bpmnSvg = await renderBpmnSvg(
            props.activities, props.connections, props.decisions,
            props.processName, props.companyName ?? undefined,
          );
          bpmnAspect = measureSvgAspect(bpmnSvg);
        } catch { /* ignore */ }
      }

      let effFormat: string | [number, number] = format === "auto" ? "a4" : format;
      let effOrientation: Orientation = orientation;
      if (format === "auto") {
        // Landscape sempre. Escolhe formato pelo aspecto do diagrama para
        // caber o fluxo COMPLETO em uma única página, sem tiling.
        effOrientation = "landscape";
        if (bpmnAspect > 2.4) effFormat = "a2";
        else if (bpmnAspect > 1.75) effFormat = "a3";
        else effFormat = "a4";
      }


      const pdf = new jsPDF({ unit: "mm", format: effFormat as any, orientation: effOrientation });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const marginX = 14;
      const contentTop = 24;
      const contentBottom = pageH - 18;

      const now = new Date();
      const emissao = now.toLocaleDateString("pt-BR");

      // -------- CAPA --------
      if (sections.cover) {
        pdf.setFillColor(primary);
        pdf.rect(0, 0, pageW, 65, "F");
        pdf.setTextColor("#ffffff");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        if (header) pdf.text(stripHtml(header).slice(0, 100), marginX, 18);
        pdf.setFontSize(28);
        pdf.text("Documento de Processo", marginX, 44);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        pdf.text(props.companyName ?? "", marginX, 55);

        const [consLogo, cliLogo] = await Promise.all([
          loadImage(tpl?.consultancy_logo_url), loadImage(tpl?.client_logo_url),
        ]);
        if (consLogo) safeAddImage(pdf, consLogo, pageW - marginX - 34, 8, 34, 17);
        if (cliLogo) safeAddImage(pdf, cliLogo, pageW - marginX - 34, 28, 34, 17);

        pdf.setTextColor(primary);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.text(pdf.splitTextToSize(title, pageW - marginX * 2) as string[], marginX, 90);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor("#334155");
        const meta = [
          `Código: ${code}`,
          `Versão: ${version}`,
          `Emissão: ${emissao}`,
          `Consultor: ${consultant}`,
        ];
        meta.forEach((t, i) => pdf.text(t, marginX, 120 + i * 7));

        pdf.setTextColor(accent);
        pdf.setFontSize(9);
        pdf.text("BPMN 2.0 · Padrão profissional de consultoria", marginX, pageH - 12);
      }

      // Helper: add page with header/footer
      let pageNum = 1;
      const totalPagesToken = "{{TOTAL_PAGES}}";
      function addContentPage() {
        pdf.addPage();
        pageNum++;
        drawHeader();
        drawFooter();
      }
      function drawHeader() {
        pdf.setDrawColor(primary);
        pdf.setLineWidth(0.4);
        pdf.line(marginX, 16, pageW - marginX, 16);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(primary);
        pdf.text(stripHtml(header).slice(0, 60) || (props.companyName ?? ""), marginX, 11);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(accent);
        pdf.text(title.slice(0, 70), pageW / 2, 11, { align: "center" });
        pdf.setTextColor("#475569");
        pdf.text(`${code} · v${version} · ${emissao}`, pageW - marginX, 11, { align: "right" });
      }
      function drawFooter() {
        pdf.setDrawColor(primary);
        pdf.line(marginX, pageH - 14, pageW - marginX, pageH - 14);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor("#475569");
        pdf.text(stripHtml(footer).slice(0, 90), marginX, pageH - 8);
        pdf.text(consultant, pageW / 2, pageH - 8, { align: "center" });
        pdf.text(`Página ${pageNum} / ${totalPagesToken}`, pageW - marginX, pageH - 8, { align: "right" });
      }

      // Start content
      addContentPage();
      let cursor = contentTop;

      function ensureSpace(h: number) {
        if (cursor + h > contentBottom) {
          addContentPage();
          cursor = contentTop;
        }
      }
      function heading(text: string) {
        ensureSpace(14);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(primary);
        pdf.text(text, marginX, cursor);
        pdf.setDrawColor(accent);
        pdf.setLineWidth(0.6);
        pdf.line(marginX, cursor + 1.5, marginX + 40, cursor + 1.5);
        cursor += 10;
      }
      function paragraph(text: string) {
        if (!text) return;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor("#0f172a");
        const lines = pdf.splitTextToSize(text, pageW - marginX * 2) as string[];
        for (const line of lines) {
          ensureSpace(6);
          pdf.text(line, marginX, cursor);
          cursor += 5.5;
        }
        cursor += 2;
      }

      // -------- TOC (simple) --------
      if (sections.toc) {
        heading("Sumário");
        const toc = [
          sections.general && "1. Dados Gerais",
          sections.matrix && "2. Matriz do Processo",
          sections.bpmn && "3. Diagrama BPMN 2.0",
          sections.legend && "4. Legenda BPMN",
          sections.indicators && props.indicators?.length && "5. Indicadores",
          sections.plans && props.plans?.length && "6. Planos de Ação",
          sections.crono && props.crono?.length && "7. Cronoanálise",
          sections.approval && "8. Aprovação",
        ].filter(Boolean) as string[];
        toc.forEach((t) => paragraph("• " + t));
      }

      // -------- GENERAL --------
      if (sections.general) {
        heading("Dados Gerais");
        if (objective) { paragraph(`Objetivo: ${objective}`); }
        if (scope) { paragraph(`Escopo/Descrição: ${scope}`); }
        if (props.processResponsible) paragraph(`Responsável: ${props.processResponsible}`);
        if (props.processInputs) paragraph(`Entradas: ${props.processInputs}`);
        if (props.processOutputs) paragraph(`Saídas: ${props.processOutputs}`);
        if (notes) paragraph(`Observações: ${notes}`);
      }

      // -------- MATRIX --------
      if (sections.matrix && props.activities.length > 0) {
        heading("Matriz do Processo");
        const rows = props.activities
          .slice()
          .sort((a, b) => a.ordering - b.ordering)
          .map((a, idx) => [
            String(idx + 1),
            a.title,
            a.responsible ?? "—",
            (a as any).inputs ?? "—",
            (a as any).outputs ?? "—",
            a.time_minutes != null ? `${a.time_minutes} min` : "—",
            ((a as any).systems ?? []).join(", ") || "—",
            ((a as any).documents ?? []).join(", ") || "—",
          ]);
        autoTable(pdf, {
          startY: cursor,
          head: [["ID", "Atividade", "Responsável", "Entradas", "Saídas", "Tempo", "Sistema", "Documentos"]],
          body: rows,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: hexToRgb(primary), textColor: 255 },
          margin: { left: marginX, right: marginX },
          didDrawPage: () => { drawHeader(); drawFooter(); },
        });
        cursor = (pdf as any).lastAutoTable.finalY + 8;
      }

      // -------- BPMN --------
      if (sections.bpmn && props.activities.length > 0) {
        if (cursor > contentTop + 20) { addContentPage(); cursor = contentTop; }
        heading("Diagrama BPMN 2.0");
        try {
          const svg = bpmnSvg ?? await renderBpmnSvg(
            props.activities, props.connections, props.decisions,
            props.processName, props.companyName ?? undefined,
          );
          const availW = pageW - marginX * 2;
          const availH = contentBottom - cursor;
          const pageAspect = availW / availH;
          const ratio = bpmnAspect;
          // Se o diagrama é muito mais largo que a página, dividir em tiles horizontais.
          const tiles = ratio > pageAspect * 1.6 ? Math.min(4, Math.ceil(ratio / pageAspect)) : 1;

          if (tiles === 1) {
            const png = await svgToPng(svg, 3000);
            let drawW = availW;
            let drawH = drawW / ratio;
            if (drawH > availH) { drawH = availH; drawW = drawH * ratio; }
            pdf.addImage(png.dataUrl, "PNG", marginX + (availW - drawW) / 2, cursor, drawW, drawH);
            cursor += drawH + 6;
          } else {
            // Renderiza em alta resolução e recorta em faixas verticais com 5% de sobreposição.
            const fullW = 3000 * tiles / 2;
            const png = await svgToPng(svg, fullW);
            const tileW = png.width / tiles;
            const overlap = Math.round(tileW * 0.05);
            for (let t = 0; t < tiles; t++) {
              if (t > 0) { addContentPage(); cursor = contentTop; heading(`Diagrama BPMN 2.0 — parte ${t + 1}/${tiles}`); }
              const sx = Math.max(0, t * tileW - (t > 0 ? overlap : 0));
              const sw = Math.min(png.width - sx, tileW + (t < tiles - 1 ? overlap : 0));
              const c = document.createElement("canvas");
              c.width = sw; c.height = png.height;
              const img = new Image();
              img.src = png.dataUrl;
              await new Promise((r) => { img.onload = r; });
              c.getContext("2d")!.drawImage(img, sx, 0, sw, png.height, 0, 0, sw, png.height);
              const tileDataUrl = c.toDataURL("image/png");
              const tileRatio = sw / png.height;
              let drawW = availW;
              let drawH = drawW / tileRatio;
              if (drawH > availH) { drawH = availH; drawW = drawH * tileRatio; }
              pdf.addImage(tileDataUrl, "PNG", marginX + (availW - drawW) / 2, cursor, drawW, drawH);
              pdf.setFontSize(7);
              pdf.setTextColor("#64748b");
              pdf.text(`Tile ${t + 1}/${tiles}`, pageW - marginX, cursor + drawH + 3, { align: "right" });
              cursor += drawH + 6;
            }
          }
        } catch (e: any) {
          paragraph(`[Falha ao renderizar BPMN: ${e?.message ?? "erro"}]`);
        }
      }

      // -------- LEGEND --------
      if (sections.legend) {
        if (cursor > contentBottom - 60) { addContentPage(); cursor = contentTop; }
        heading("Legenda BPMN");
        const legend: [string, string][] = [
          ["Círculo fino", "Evento Inicial — início do processo"],
          ["Círculo espesso", "Evento Final — encerramento"],
          ["Retângulo arredondado", "Tarefa — atividade executada"],
          ["Losango com ×", "Gateway Exclusivo (XOR) — escolhe UM caminho"],
          ["Losango com +", "Gateway Paralelo (AND) — executa em paralelo"],
          ["Seta contínua", "Fluxo de Sequência — ordem de execução"],
          ["Raia (Lane)", "Agrupamento por responsável"],
        ];
        autoTable(pdf, {
          startY: cursor,
          head: [["Símbolo", "Descrição"]],
          body: legend,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: hexToRgb(primary), textColor: 255 },
          margin: { left: marginX, right: marginX },
          didDrawPage: () => { drawHeader(); drawFooter(); },
        });
        cursor = (pdf as any).lastAutoTable.finalY + 8;
      }

      // -------- INDICATORS --------
      if (sections.indicators && (props.indicators?.length ?? 0) > 0) {
        heading("Indicadores");
        autoTable(pdf, {
          startY: cursor,
          head: [["Nome", "Unidade", "Meta"]],
          body: props.indicators!.map((i) => [i.name, i.unit ?? "—", i.target != null ? String(i.target) : "—"]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: hexToRgb(primary), textColor: 255 },
          margin: { left: marginX, right: marginX },
          didDrawPage: () => { drawHeader(); drawFooter(); },
        });
        cursor = (pdf as any).lastAutoTable.finalY + 8;
      }

      // -------- PLANS --------
      if (sections.plans && (props.plans?.length ?? 0) > 0) {
        heading("Planos de Ação");
        autoTable(pdf, {
          startY: cursor,
          head: [["Título", "Status", "Prioridade"]],
          body: props.plans!.map((p) => [p.title, p.status ?? "—", p.priority ?? "—"]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: hexToRgb(primary), textColor: 255 },
          margin: { left: marginX, right: marginX },
          didDrawPage: () => { drawHeader(); drawFooter(); },
        });
        cursor = (pdf as any).lastAutoTable.finalY + 8;
      }

      // -------- CRONO --------
      if (sections.crono && (props.crono?.length ?? 0) > 0) {
        heading("Cronoanálise");
        autoTable(pdf, {
          startY: cursor,
          head: [["Linha", "Produto", "Data"]],
          body: props.crono!.map((c) => [c.production_line ?? "—", c.product ?? "—", c.observation_date ?? "—"]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: hexToRgb(primary), textColor: 255 },
          margin: { left: marginX, right: marginX },
          didDrawPage: () => { drawHeader(); drawFooter(); },
        });
        cursor = (pdf as any).lastAutoTable.finalY + 8;
      }

      // -------- APPROVAL --------
      if (sections.approval) {
        if (cursor > contentBottom - 50) { addContentPage(); cursor = contentTop; }
        heading("Aprovação");
        cursor += 18;
        const colW = (pageW - marginX * 2 - 20) / 2;
        pdf.setDrawColor("#334155");
        pdf.line(marginX, cursor, marginX + colW, cursor);
        pdf.line(marginX + colW + 20, cursor, marginX + colW * 2 + 20, cursor);
        pdf.setFontSize(9);
        pdf.setTextColor("#475569");
        pdf.text("Elaborado por (Consultor)", marginX, cursor + 5);
        pdf.text("Aprovado por (Cliente)", marginX + colW + 20, cursor + 5);
      }

      // Fill total pages token
      const total = pdf.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        pdf.setPage(p);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor("#475569");
        // Only pages that already had the footer drawn (skip cover if enabled)
        if (!(sections.cover && p === 1)) {
          const w = pdf.internal.pageSize.getWidth();
          const h = pdf.internal.pageSize.getHeight();
          pdf.setFillColor("#ffffff");
          pdf.rect(w - 60, h - 12, 55, 8, "F");
          pdf.text(`Página ${p} / ${total}`, w - marginX, h - 8, { align: "right" });
        }
      }

      const safe = title.replace(/[^\w\-]+/g, "_").slice(0, 60) || "processo";
      pdf.save(`${safe}.pdf`);
      toast.success("PDF gerado");
      setOpen(false);
    } catch (e: any) {
      console.error("[ExportProcessPdf]", e);
      toast.error(e?.message ?? "Falha ao gerar PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Exportar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar Processo em PDF</DialogTitle>
        </DialogHeader>

        {blocked && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Existem erros críticos no fluxo. Corrija-os no painel de inconsistências antes de exportar.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Objetivo</Label>
            <Textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div>
            <Label>Escopo / Descrição</Label>
            <Textarea rows={2} value={scope} onChange={(e) => setScope(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tamanho</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (recomendado)</SelectItem>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="a3">A3</SelectItem>
                  <SelectItem value="letter">Carta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orientação</Label>
              <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Retrato</SelectItem>
                  <SelectItem value="landscape">Paisagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Seções a incluir</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  ["cover", "Capa"],
                  ["toc", "Sumário"],
                  ["general", "Dados Gerais"],
                  ["matrix", "Matriz do Processo"],
                  ["bpmn", "Diagrama BPMN"],
                  ["legend", "Legenda BPMN"],
                  ["indicators", "Indicadores"],
                  ["plans", "Planos de Ação"],
                  ["crono", "Cronoanálise"],
                  ["approval", "Aprovação"],
                ] as [keyof Sections, string][]
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <Checkbox
                    checked={sections[k]}
                    onCheckedChange={(v) => setSections((s) => ({ ...s, [k]: !!v }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={generate} disabled={busy || blocked}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- helpers ---------- */

function measureSvgAspect(svg: string): number {
  const wMatch = svg.match(/width="([\d.]+)"/);
  const hMatch = svg.match(/height="([\d.]+)"/);
  const vb = svg.match(/viewBox="([\d.\s-]+)"/);
  if (wMatch && hMatch) {
    const w = parseFloat(wMatch[1]); const h = parseFloat(hMatch[1]);
    if (w > 0 && h > 0) return w / h;
  }
  if (vb) {
    const p = vb[1].split(/\s+/).map(parseFloat);
    if (p[2] > 0 && p[3] > 0) return p[2] / p[3];
  }
  return 16 / 9;
}

function stripHtml(s: string) { return s.replace(/<[^>]*>/g, "").trim(); }

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
  } catch { /* ignore */ }
}

async function svgToPng(svg: string, targetWidthPx: number): Promise<{ dataUrl: string; width: number; height: number }> {
  // extract intrinsic w/h from SVG for aspect ratio
  const wMatch = svg.match(/width="([\d.]+)"/);
  const hMatch = svg.match(/height="([\d.]+)"/);
  const vb = svg.match(/viewBox="([\d.\s-]+)"/);
  let ratio = 16 / 9;
  if (wMatch && hMatch) ratio = parseFloat(wMatch[1]) / parseFloat(hMatch[1]);
  else if (vb) {
    const p = vb[1].split(/\s+/).map(parseFloat);
    ratio = p[2] / p[3];
  }
  const w = targetWidthPx;
  const h = Math.round(w / ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  const v = await Canvg.from(ctx, svg, { ignoreDimensions: true, ignoreClear: true });
  v.resize(w, h, "xMidYMid meet");
  await v.render();
  return { dataUrl: canvas.toDataURL("image/png"), width: w, height: h };
}
