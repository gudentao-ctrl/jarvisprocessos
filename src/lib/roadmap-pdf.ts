import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { RoadmapCockpitData } from "./torre-controle-storage";

const NAVY: [number, number, number] = [17, 39, 78];
const ACCENT: [number, number, number] = [30, 64, 175];
const GREY: [number, number, number] = [100, 116, 139];
const EMERALD: [number, number, number] = [16, 149, 93];
const ICEBERG_TOP: [number, number, number] = [238, 246, 255];
const ICEBERG_DEEP: [number, number, number] = [237, 242, 254];

const brl = (n: number) =>
  `R$ ${Number(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function exportRoadmapExecutivePdf(
  data: RoadmapCockpitData,
  companyName: string = "Empresa Ativa"
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const contentWidth = W - M * 2;

  // Header Banner
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("MAIA CONSULTORIA E GESTÃO", M, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 215, 245);
  doc.text("TORRE DE CONTROLE  |  STATUS REPORT EXECUTIVO (GESTÃO À VISTA)", M, 19);

  doc.setFontSize(8.5);
  doc.setTextColor(230, 235, 245);
  const dateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Empresa: ${companyName}  ·  Data de Emissão: ${dateStr}`, M, 24);

  // Accent Line
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 28, W, 1.5, "F");

  let y = 36;

  // SECTION 1: KPIS DE IMPACTO
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. KPIS DE IMPACTO E CRIAÇÃO DE VALOR", M, y);
  y += 5;

  const cardW = (contentWidth - 6) / 3;
  const cardH = 22;

  // KPI 1: Faturamento
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(M, y, cardW, cardH, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREY);
  doc.text("CRESCIMENTO DE FATURAMENTO", M + 4, y + 5);
  doc.setFontSize(14);
  doc.setTextColor(...EMERALD);
  doc.text(`+${data.kpis.revenue_growth_pct}%`, M + 4, y + 13);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text(
    doc.splitTextToSize(data.kpis.revenue_growth_note, cardW - 8),
    M + 4,
    y + 17
  );

  // KPI 2: Maturidade
  const kpi2X = M + cardW + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi2X, y, cardW, cardH, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREY);
  doc.text("EVOLUÇÃO DA MATURIDADE (360°)", kpi2X + 4, y + 5);
  doc.setFontSize(14);
  doc.setTextColor(...ACCENT);
  doc.text(`+${data.kpis.maturity_growth_pct}%`, kpi2X + 4, y + 13);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text(
    doc.splitTextToSize(data.kpis.maturity_growth_note, cardW - 8),
    kpi2X + 4,
    y + 17
  );

  // KPI 3: Otimização Custos
  const kpi3X = kpi2X + cardW + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi3X, y, cardW, cardH, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREY);
  doc.text("OTIMIZAÇÃO DE CUSTOS GERAIS", kpi3X + 4, y + 5);
  doc.setFontSize(14);
  doc.setTextColor(217, 119, 6);
  doc.text(`-${data.kpis.cost_reduction_pct}%`, kpi3X + 4, y + 13);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text(
    doc.splitTextToSize(data.kpis.cost_reduction_note, cardW - 8),
    kpi3X + 4,
    y + 17
  );

  y += cardH + 8;

  // SECTION 2: O RAIO-X DO PROJETO (INFOGRÁFICO DO ICEBERG)
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("2. RAIO-X DO PROJETO: O ICEBERG DA TRANSFORMAÇÃO", M, y);
  y += 5;

  // Topo do Iceberg (Superfície)
  doc.setFillColor(...ICEBERG_TOP);
  doc.setDrawColor(186, 218, 255);
  doc.roundedRect(M, y, contentWidth, 24, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(29, 78, 216);
  doc.text("SUPERFÍCIE VISÍVEL: SINTOMAS & DORES INICIAIS DECLARADAS", M + 4, y + 5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);

  let symY = y + 10;
  data.iceberg.surface_symptoms.slice(0, 4).forEach((sym, idx) => {
    doc.text(`• [${sym.severity.toUpperCase()}] ${sym.text}`, M + 6, symY);
    symY += 4.2;
  });

  y += 26;

  // Subsolo Operacional (Abaixo d'água)
  doc.setFillColor(...ICEBERG_DEEP);
  doc.setDrawColor(147, 197, 253);
  doc.roundedRect(M, y, contentWidth, 42, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(
    "SUBSOLO OPERACIONAL: MARCOS TRATADOS PELAS 3 FRENTES (TRABALHO INVISÍVEL)",
    M + 4,
    y + 5
  );

  const tableRows = data.iceberg.underwater_milestones.slice(0, 4).map((m) => [
    m.front,
    m.title,
    m.impact,
    m.status === "resolvido" ? "RESOLVIDO" : "EM ANDAMENTO",
  ]);

  autoTable(doc, {
    startY: y + 7,
    margin: { left: M + 2, right: M + 2 },
    head: [["Frente", "Marco Estruturado", "Impacto Mensurável", "Status"]],
    body: tableRows,
    styles: { fontSize: 7, cellPadding: 1.8 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: "bold" },
      1: { cellWidth: 50 },
      2: { cellWidth: 65 },
      3: { cellWidth: 26, halign: "center" },
    },
  });

  // SECTION 3: RADAR DE MATURIDADE 360°
  // Nova Página para garantir elegância executiva
  doc.addPage();

  // Header mini na página 2
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("MAIA CONSULTORIA E GESTÃO  |  RADAR 360° E EVOLUÇÃO FINANCEIRA", M, 9);

  let p2Y = 22;

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("3. RADAR DE MATURIDADE 360° (ALINHAMENTO POR PILAR)", M, p2Y);
  p2Y += 5;

  const radarTableRows = data.radar_360.pilars.map((p) => [
    p.pilar,
    `${p.donos.toFixed(1)} / 5.0`,
    `${p.gestao.toFixed(1)} / 5.0`,
    `${p.colaboradores.toFixed(1)} / 5.0`,
    `${p.mes_inicial.toFixed(1)} → ${p.mes_atual.toFixed(1)}`,
    (p.donos - p.colaboradores >= 1.5 ? "Gap Crítico" : "Alinhado"),
  ]);

  autoTable(doc, {
    startY: p2Y,
    margin: { left: M, right: M },
    head: [
      [
        "Pilar do Sincronismo 360°",
        "Visão Donos",
        "Visão Gestão",
        "Visão Colaborador",
        "Evolução (Mês 1 → Atual)",
        "Diagnóstico de Alinhamento",
      ],
    ],
    body: radarTableRows,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 32, halign: "center", textColor: ACCENT, fontStyle: "bold" },
      5: { cellWidth: 20, halign: "center" },
    },
  });

  p2Y = (doc as any).lastAutoTable.finalY + 6;

  // Narrativa de Gaps
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(M, p2Y, contentWidth, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("SÍNTESE EXECUTIVA DO CONSULTOR SOBRE O ALINHAMENTO:", M + 4, p2Y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    doc.splitTextToSize(data.radar_360.gaps_narrative, contentWidth - 8),
    M + 4,
    p2Y + 10
  );

  p2Y += 24;

  // SECTION 4: EVOLUÇÃO FINANCEIRA & ROI DA CONSULTORIA
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("4. ROI DA CONSULTORIA & TENDÊNCIA FINANCEIRA", M, p2Y);
  p2Y += 5;

  const roiTableRows = data.roi_timeline.map((r) => [
    r.period,
    brl(r.revenue),
    brl(r.costs),
    brl(r.profit),
    r.intervention_pin ? `${r.intervention_pin.title} (${r.intervention_pin.front})` : "-",
  ]);

  autoTable(doc, {
    startY: p2Y,
    margin: { left: M, right: M },
    head: [["Período", "Faturamento Bruto", "Custos Totais", "Resultado Líquido", "Marco de Intervenção"]],
    body: roiTableRows,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      1: { cellWidth: 30, halign: "right" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right", fontStyle: "bold", textColor: EMERALD },
      4: { cellWidth: 56 },
    },
  });

  // Footer em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(
      `JARVIS PROCESSO  ·  Relatório Executivo de Gestão à Vista  ·  Confidencial`,
      M,
      H - 8
    );
    doc.text(`Página ${i} de ${totalPages}`, W - M, H - 8, { align: "right" });
  }

  doc.save(`status-report-executivo-${companyName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
