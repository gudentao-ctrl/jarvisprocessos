import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { popProcessName, type PopContent } from "@/lib/pop-types";

const NAVY: [number, number, number] = [17, 39, 78];
const ACCENT: [number, number, number] = [30, 92, 168];
const LIGHT: [number, number, number] = [237, 242, 249];
const GREY: [number, number, number] = [110, 116, 128];

const M = 18;

type Ctx = {
  doc: jsPDF;
  W: number;
  H: number;
  y: number;
  headerTitle: string;
  code: string;
  version: string;
};

const CHAR_MAP: Record<string, string> = {
  "\u2265": ">=", "\u2264": "<=", "\u2260": "!=", "\u2248": "~", "\u00b1": "+/-",
  "\u2192": "->", "\u2190": "<-", "\u2022": "-", "\u2011": "-", "\u2212": "-",
  "\u200b": "", "\u00a0": " ",
};

/** jsPDF core fonts are WinAnsi: swap glyphs they cannot render. */
function sanitize(v?: string) {
  return (v ?? "")
    .replace(/[\u2265\u2264\u2260\u2248\u00b1\u2192\u2190\u2022\u2011\u2212\u200b\u00a0]/g, (c) => CHAR_MAP[c] ?? c)
    .replace(/[\u0100-\u01ff\u2000-\u2bff]/g, (c) => (c === "\u2013" || c === "\u2014" ? "-" : c === "\u2018" || c === "\u2019" ? "'" : c === "\u201c" || c === "\u201d" ? '"' : ""));
}

const dash = (v?: string) => {
  const t = sanitize(v).trim();
  return t || "-";
};

function lastY(doc: jsPDF, fallback: number) {
  const t = (doc as any).lastAutoTable;
  return t?.finalY != null ? t.finalY : fallback;
}

function ensure(ctx: Ctx, h: number) {
  if (ctx.y + h > ctx.H - 22) {
    ctx.doc.addPage();
    ctx.y = 32;
  }
}

function sectionTitle(ctx: Ctx, n: number, text: string) {
  const { doc } = ctx;
  ensure(ctx, 18);
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, ctx.y - 4.5, 7, 7, 1.2, 1.2, "F");
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(255, 255, 255);
  doc.text(String(n), M + 3.5, ctx.y + 0.4, { align: "center" });
  doc.setFontSize(12).setTextColor(...NAVY);
  doc.text(text, M + 10, ctx.y + 0.6);
  ctx.y += 4;
  doc.setDrawColor(...ACCENT).setLineWidth(0.5);
  doc.line(M, ctx.y, ctx.W - M, ctx.y);
  doc.setLineWidth(0.2);
  ctx.y += 7;
  doc.setTextColor(30, 30, 30);
}

function paragraph(ctx: Ctx, text: string) {
  const { doc } = ctx;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(45, 45, 45);
  const width = ctx.W - M * 2;
  for (const line of doc.splitTextToSize(dash(text), width) as string[]) {
    ensure(ctx, 6);
    doc.text(line, M, ctx.y);
    ctx.y += 5.2;
  }
  ctx.y += 3;
}

function bullets(ctx: Ctx, items: string[]) {
  const { doc } = ctx;
  if (!items.length) return paragraph(ctx, "—");
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(45, 45, 45);
  const width = ctx.W - M * 2 - 6;
  for (const item of items) {
    const parts = doc.splitTextToSize(sanitize(item), width) as string[];
    parts.forEach((line, i) => {
      ensure(ctx, 6);
      if (i === 0) {
        doc.setFillColor(...ACCENT);
        doc.circle(M + 1.6, ctx.y - 1.2, 0.9, "F");
      }
      doc.text(line, M + 6, ctx.y);
      ctx.y += 5.2;
    });
    ctx.y += 1;
  }
  ctx.y += 2;
}

function table(ctx: Ctx, head: string[], body: string[][], widths?: number[]) {
  const total = ctx.W - M * 2;
  const columnStyles: Record<number, any> = {};
  widths?.forEach((w, i) => (columnStyles[i] = { cellWidth: (w / 100) * total }));
  ensure(ctx, 24);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: M, right: M, top: 32, bottom: 22 },
    head: [head.map(sanitize)],
    body: (body.length ? body : [head.map(() => "-")]).map((r) => r.map(dash)),
    rowPageBreak: "avoid",
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.4, lineColor: [214, 220, 230], lineWidth: 0.15, textColor: [45, 45, 45], valign: "top" },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    columnStyles,
  });
  ctx.y = lastY(ctx.doc, ctx.y) + 8;
}

function coverPage(ctx: Ctx, pop: PopContent, companyName?: string) {
  const { doc, W, H } = ctx;
  const id = pop.identification;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 78, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 78, W, 2.5, "F");

  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(160, 190, 235);
  doc.text("DOCUMENTO CONTROLADO - SISTEMA DE GESTÃO POR PROCESSOS", M, 24);

  doc.setFontSize(24).setTextColor(255, 255, 255);
  doc.text("Procedimento", M, 42);
  doc.text("Operacional Padrão", M, 54);

  doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(200, 215, 240);
  doc.text(dash(companyName), M, 66);

  let y = 100;
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...NAVY);
  for (const line of doc.splitTextToSize(dash(popProcessName(pop)) || "Processo", W - M * 2) as string[]) {
    doc.text(line, M, y);
    y += 8;
  }

  y += 4;
  const rows: string[][] = [
    ["Código do POP", dash(id.code), "Versão", dash(id.version)],
    ["Data de emissão", dash(id.issue_date), "Última revisão", dash(id.last_revision)],
    ["Área responsável", dash(id.area), "Responsável do processo", dash(id.process_owner)],
    ["Elaborado por", dash(id.prepared_by), "Aprovado por", dash(id.approved_by)],
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: rows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 3, lineColor: [214, 220, 230], lineWidth: 0.15 },
    columnStyles: {
      0: { fillColor: LIGHT, fontStyle: "bold", textColor: NAVY, cellWidth: (W - M * 2) * 0.26 },
      1: { cellWidth: (W - M * 2) * 0.24 },
      2: { fillColor: LIGHT, fontStyle: "bold", textColor: NAVY, cellWidth: (W - M * 2) * 0.26 },
      3: { cellWidth: (W - M * 2) * 0.24 },
    },
  });

  y = lastY(doc, y) + 12;
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...NAVY);
  doc.text("Objetivo do documento", M, y);
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(60, 60, 60);
  const objective = doc.splitTextToSize(dash(pop.objective), W - M * 2) as string[];
  for (const line of objective.slice(0, 10)) {
    doc.text(line, M, y);
    y += 5;
  }

  // Signature block
  const sy = H - 58;
  doc.setDrawColor(190, 198, 210);
  doc.line(M, sy, M + 70, sy);
  doc.line(W - M - 70, sy, W - M, sy);
  doc.setFontSize(8.5).setTextColor(...GREY);
  doc.text(`Elaborado por: ${dash(id.prepared_by)}`, M, sy + 5);
  doc.text(`Aprovado por: ${dash(id.approved_by)}`, W - M - 70, sy + 5);

  doc.setFontSize(8).setTextColor(...GREY);
  doc.text(
    "Este documento é propriedade da organização. A reprodução total ou parcial sem autorização é proibida.",
    M,
    H - 26,
  );
}

function decorate(ctx: Ctx) {
  const { doc, W, H } = ctx;
  const pages = doc.getNumberOfPages();
  for (let p = 2; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 16, "F");
    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(255, 255, 255);
    doc.text(sanitize("POP - " + ctx.headerTitle), M, 10, { maxWidth: W - M * 2 - 45 });
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(`Cod. ${dash(ctx.code)}`).replace("Cod.", "Cód.") | Rev. ${dash(ctx.version)}`, W - M, 10, { align: "right" });

    doc.setDrawColor(214, 220, 230);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFontSize(8).setTextColor(...GREY);
    doc.text("Documento controlado - impressão sem controle de revisão", M, H - 9);
    doc.text(`Página ${p} de ${pages}`, W - M, H - 9, { align: "right" });
  }
}

export function buildPopPdf(pop: PopContent, companyName?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ctx: Ctx = {
    doc,
    W: doc.internal.pageSize.getWidth(),
    H: doc.internal.pageSize.getHeight(),
    y: 32,
    headerTitle: popProcessName(pop) || "Processo",
    code: pop.identification.code,
    version: pop.identification.version,
  };

  coverPage(ctx, pop, companyName);
  doc.addPage();
  ctx.y = 32;

  const id = pop.identification;

  sectionTitle(ctx, 1, "Identificação");
  table(
    ctx,
    ["Campo", "Conteúdo"],
    [
      ["Nome do processo", dash(id.process_name)],
      ["Código do POP", dash(id.code)],
      ["Versão", dash(id.version)],
      ["Data de emissão", dash(id.issue_date)],
      ["Última revisão", dash(id.last_revision)],
      ["Responsável pelo processo", dash(id.process_owner)],
      ["Área responsável", dash(id.area)],
      ["Elaborado por", dash(id.prepared_by)],
      ["Aprovado por", dash(id.approved_by)],
    ],
    [32, 68],
  );

  sectionTitle(ctx, 2, "Objetivo");
  paragraph(ctx, pop.objective);

  sectionTitle(ctx, 3, "Aplicação / Escopo");
  paragraph(ctx, pop.scope);

  sectionTitle(ctx, 4, "Definições e siglas");
  table(ctx, ["Termo", "Definição"], pop.definitions.map((d) => [dash(d.term), dash(d.definition)]), [28, 72]);

  sectionTitle(ctx, 5, "Responsabilidades");
  table(
    ctx,
    ["Responsável", "Função", "Responsabilidade"],
    pop.responsibilities.map((r) => [dash(r.role), dash(r.job_function), dash(r.responsibility)]),
    [24, 22, 54],
  );

  sectionTitle(ctx, 6, "Entradas");
  bullets(ctx, pop.inputs);

  sectionTitle(ctx, 7, "Procedimento Operacional");
  if (!pop.steps.length) paragraph(ctx, "-");
  pop.steps.forEach((s, i) => {
    ensure(ctx, 26);
    const { doc: d } = ctx;
    d.setFillColor(...LIGHT);
    d.roundedRect(M, ctx.y - 5, ctx.W - M * 2, 8.5, 1.5, 1.5, "F");
    d.setFont("helvetica", "bold").setFontSize(10).setTextColor(...NAVY);
    d.text(sanitize(`Etapa ${i + 1} - ${s.title || "-"}`), M + 3, ctx.y + 0.6, { maxWidth: ctx.W - M * 2 - 6 });
    ctx.y += 10;
    if (s.description) paragraph(ctx, s.description);
    const meta = [
      ["Responsável", s.responsible],
      ["Documentos utilizados", s.documents],
      ["Sistema utilizado", s.system],
      ["Critérios de decisão", s.decision_criteria],
      ["Resultado esperado", s.expected_result],
    ].filter(([, v]) => v && String(v).trim()) as string[][];
    if (meta.length) table(ctx, ["Atributo", "Detalhamento"], meta, [30, 70]);
    else ctx.y += 2;
  });

  sectionTitle(ctx, 8, "Regras de Negócio");
  bullets(ctx, pop.business_rules);

  sectionTitle(ctx, 9, "Pontos de Controle");
  bullets(ctx, pop.control_points);

  sectionTitle(ctx, 10, "Riscos do Processo");
  table(
    ctx,
    ["Risco", "Impacto", "Mitigação"],
    pop.risks.map((r) => [dash(r.description), dash(r.impact), dash(r.mitigation)]),
    [40, 22, 38],
  );

  sectionTitle(ctx, 11, "Indicadores sugeridos");
  table(
    ctx,
    ["Indicador", "Descrição", "Fórmula", "Meta"],
    pop.indicators.map((i) => [dash(i.name), dash(i.description), dash(i.formula), dash(i.goal)]),
    [22, 36, 26, 16],
  );

  sectionTitle(ctx, 12, "Saídas");
  bullets(ctx, pop.outputs);

  sectionTitle(ctx, 13, "Sistemas utilizados");
  bullets(ctx, pop.systems);

  sectionTitle(ctx, 14, "Documentos Relacionados");
  bullets(ctx, pop.related_documents);

  sectionTitle(ctx, 15, "Pontos de Atenção");
  bullets(ctx, pop.attention_points);

  sectionTitle(ctx, 16, "Observações");
  paragraph(ctx, pop.notes);

  sectionTitle(ctx, 17, "Controle de revisões e aprovação");
  table(
    ctx,
    ["Versão", "Data", "Descrição da alteração", "Responsável"],
    [[dash(id.version), dash(id.issue_date), "Emissão do documento", dash(id.prepared_by)]],
    [14, 20, 46, 20],
  );

  decorate(ctx);
  return doc;
}
